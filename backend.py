"""
AI Study Assistant - Simplified Python Backend
FastAPI server with OpenCV-based camera processing and face detection
(MediaPipe alternative for Python 3.13 compatibility)
"""

import cv2
import numpy as np
import asyncio
import json
import base64
from typing import Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging
import math

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Study Assistant Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OpenCVStateDetector:
    """AI State Detection using OpenCV face and eye detection"""
    
    def __init__(self):
        # Load OpenCV classifiers
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        # State detection thresholds
        self.DROWSY_EYE_THRESHOLD = 0.02  # Eye area ratio threshold
        self.DROWSY_TIME_THRESHOLD = 3.0  # seconds
        self.DISTRACTION_FACE_THRESHOLD = 0.3  # Face position threshold
        
        # State timing
        self.current_state = 'unknown'
        self.state_start_time = datetime.now()
        self.eye_closed_start = None
        
    def calculate_eye_aspect_ratio(self, eye_region: np.ndarray) -> float:
        """Calculate simplified eye aspect ratio from eye region"""
        if eye_region.size == 0:
            return 0.0
        
        # Convert to grayscale if needed
        if len(eye_region.shape) == 3:
            gray = cv2.cvtColor(eye_region, cv2.COLOR_BGR2GRAY)
        else:
            gray = eye_region
        
        # Calculate the ratio of eye area to bounding box area
        non_zero_pixels = cv2.countNonZero(gray)
        total_pixels = gray.shape[0] * gray.shape[1]
        
        if total_pixels == 0:
            return 0.0
            
        return non_zero_pixels / total_pixels
    
    def estimate_head_pose(self, face_rect: tuple, frame_shape: tuple) -> Dict[str, float]:
        """Estimate head pose based on face position"""
        x, y, w, h = face_rect
        frame_height, frame_width = frame_shape[:2]
        
        # Calculate face center
        face_center_x = x + w // 2
        face_center_y = y + h // 2
        
        # Calculate relative position (normalized to -1 to 1)
        relative_x = (face_center_x - frame_width // 2) / (frame_width // 2)
        relative_y = (face_center_y - frame_height // 2) / (frame_height // 2)
        
        # Estimate angles based on position
        # Yaw: left-right head movement
        yaw = relative_x * 45  # Scale to roughly -45 to 45 degrees
        
        # Pitch: up-down head movement
        pitch = relative_y * 30  # Scale to roughly -30 to 30 degrees
        
        # Roll: assume minimal roll for simplicity
        roll = 0
        
        return {
            'pitch': float(pitch),
            'yaw': float(yaw),
            'roll': float(roll)
        }
    
    def detect_state(self, frame: np.ndarray) -> Dict[str, Any]:
        """Detect focus state from frame using OpenCV"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            return {
                'state': 'unknown',
                'confidence': 0.0,
                'head_pose': {'pitch': 0, 'yaw': 0, 'roll': 0},
                'eye_aspect_ratio': 0.0,
                'landmarks_detected': False,
                'face_detected': False
            }
        
        # Use the largest face
        face = max(faces, key=lambda f: f[2] * f[3])
        x, y, w, h = face
        
        # Extract face region
        face_roi_gray = gray[y:y+h, x:x+w]
        face_roi_color = frame[y:y+h, x:x+w]
        
        # Detect eyes in the face region
        eyes = self.eye_cascade.detectMultiScale(face_roi_gray, 1.1, 3)
        
        # Calculate eye aspect ratio
        eye_aspect_ratio = 0.0
        if len(eyes) >= 2:
            # Use the two largest eyes
            eyes_sorted = sorted(eyes, key=lambda e: e[2] * e[3], reverse=True)[:2]
            eye_ratios = []
            
            for (ex, ey, ew, eh) in eyes_sorted:
                eye_region = face_roi_gray[ey:ey+eh, ex:ex+ew]
                ratio = self.calculate_eye_aspect_ratio(eye_region)
                eye_ratios.append(ratio)
            
            eye_aspect_ratio = sum(eye_ratios) / len(eye_ratios)
        
        # Estimate head pose
        head_pose = self.estimate_head_pose(face, frame.shape)
        
        # Determine state based on measurements
        current_time = datetime.now()
        state = 'unknown'  # Initialize state variable
        
        # Check for drowsiness (eyes closed/small)
        if eye_aspect_ratio < self.DROWSY_EYE_THRESHOLD and len(eyes) < 2:
            if self.eye_closed_start is None:
                self.eye_closed_start = current_time
                state = 'focused'  # Initial grace period
            elif (current_time - self.eye_closed_start).total_seconds() > self.DROWSY_TIME_THRESHOLD:
                state = 'drowsy'
            else:
                state = 'focused'  # Still in grace period
        else:
            self.eye_closed_start = None
            
            # Check for distraction (face position)
            if abs(head_pose['yaw']) > 25:  # Looking sideways
                state = 'relaxing'
            elif head_pose['pitch'] > 15:  # Looking down
                state = 'distracted'
            elif abs(head_pose['pitch']) > 20:  # Looking up
                state = 'relaxing'
            else:
                state = 'focused'
        
        # Calculate confidence based on face size and detection quality
        face_area = w * h
        frame_area = frame.shape[0] * frame.shape[1]
        face_ratio = face_area / frame_area
        
        # Higher confidence for larger, well-positioned faces
        confidence = min(1.0, max(0.3, face_ratio * 10))
        
        return {
            'state': state,
            'confidence': confidence,
            'head_pose': head_pose,
            'eye_aspect_ratio': eye_aspect_ratio,
            'landmarks_detected': len(eyes) >= 2,
            'face_detected': True,
            'face_area_ratio': face_ratio,
            'eyes_detected': len(eyes),
            'timestamp': current_time.isoformat()
        }

class CameraManager:
    """Manages camera capture and processing"""
    
    def __init__(self):
        self.cap = None
        self.is_running = False
        self.detector = OpenCVStateDetector()
        
    def start_camera(self, camera_index: int = 0) -> bool:
        """Start camera capture"""
        try:
            self.cap = cv2.VideoCapture(camera_index)
            if not self.cap.isOpened():
                logger.error(f"Could not open camera {camera_index}")
                return False
                
            # Set camera properties
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            self.is_running = True
            logger.info("Camera started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error starting camera: {e}")
            return False
    
    def stop_camera(self):
        """Stop camera capture"""
        self.is_running = False
        if self.cap:
            self.cap.release()
            self.cap = None
        logger.info("Camera stopped")
    
    def get_frame_with_detection(self) -> Optional[Dict[str, Any]]:
        """Capture frame and run AI detection"""
        if not self.cap or not self.is_running:
            return None
            
        ret, frame = self.cap.read()
        if not ret:
            return None
        
        # Flip frame horizontally for mirror effect
        frame = cv2.flip(frame, 1)
        
        # Run AI detection
        detection_result = self.detector.detect_state(frame)
        
        # Draw detection results on frame for visualization
        self.draw_detection_overlay(frame, detection_result)
        
        # Encode frame as base64 for web transmission
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        frame_b64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            'frame': frame_b64,
            'detection': detection_result,
            'timestamp': datetime.now().isoformat()
        }
    
    def draw_detection_overlay(self, frame: np.ndarray, detection: Dict[str, Any]):
        """Draw detection information on the frame"""
        if not detection.get('face_detected', False):
            return
            
        # Draw state indicator
        state = detection['state']
        color_map = {
            'focused': (0, 255, 0),      # Green
            'relaxing': (255, 255, 0),   # Yellow  
            'distracted': (0, 165, 255), # Orange
            'drowsy': (0, 0, 255),       # Red
            'unknown': (128, 128, 128)   # Gray
        }
        
        color = color_map.get(state, (128, 128, 128))
        
        # Draw state text
        cv2.putText(frame, f"State: {state.upper()}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        
        # Draw confidence
        confidence = detection['confidence']
        cv2.putText(frame, f"Confidence: {confidence:.2f}", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        # Draw head pose
        head_pose = detection['head_pose']
        cv2.putText(frame, f"Yaw: {head_pose['yaw']:.1f}", (10, 90), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"Pitch: {head_pose['pitch']:.1f}", (10, 110), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

# Global camera manager
camera_manager = CameraManager()

@app.get("/")
async def root():
    return {"message": "AI Study Assistant Backend is running!"}

@app.get("/camera/status")
async def camera_status():
    return {
        "is_running": camera_manager.is_running,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/camera/start")
async def start_camera():
    success = camera_manager.start_camera()
    return {
        "success": success,
        "message": "Camera started" if success else "Failed to start camera"
    }

@app.post("/camera/stop")
async def stop_camera():
    camera_manager.stop_camera()
    return {"success": True, "message": "Camera stopped"}

@app.websocket("/ws/camera")
async def websocket_camera(websocket: WebSocket):
    """WebSocket endpoint for real-time camera feed"""
    await websocket.accept()
    logger.info("WebSocket connection established")
    
    try:
        # Start camera if not already running
        if not camera_manager.is_running:
            camera_manager.start_camera()
        
        while True:
            # Get frame with AI detection
            result = camera_manager.get_frame_with_detection()
            
            if result:
                await websocket.send_text(json.dumps(result))
            else:
                await websocket.send_text(json.dumps({
                    "error": "No frame available",
                    "timestamp": datetime.now().isoformat()
                }))
            
            # Control frame rate (15 FPS for stability)
            await asyncio.sleep(1/15)
            
    except WebSocketDisconnect:
        logger.info("WebSocket connection disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Don't stop camera automatically - let multiple clients connect
        pass

if __name__ == "__main__":
    import uvicorn
    print("🐍 Starting AI Study Assistant Backend (OpenCV)")
    print("📹 Camera processing: OpenCV Haar Cascades")  
    print("🌐 Server: http://127.0.0.1:8000")
    print("🔌 WebSocket: ws://127.0.0.1:8000/ws/camera")
    print("💡 Features: Face detection, Eye tracking, Head pose estimation")
    print("")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
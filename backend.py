"""
AI Study Assistant - Enhanced Python Backend
FastAPI server with advanced OpenCV-based camera processing:
- Precise head pose estimation using PnP solver
- Scientific Eye Aspect Ratio calculation
- State machine with timer-based transitions
- Session logging and analytics
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
from enhanced_detector import EnhancedStateDetector

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

# Enhanced detector is imported from enhanced_detector.py

class CameraManager:
    """Manages camera capture and processing with enhanced AI detection"""
    
    def __init__(self):
        self.cap = None
        self.is_running = False
        self.detector = EnhancedStateDetector()
        
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
        
        # Draw state text with enhanced info
        cv2.putText(frame, f"State: {state.upper()}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        
        # Draw confidence
        confidence = detection['confidence']
        cv2.putText(frame, f"Confidence: {confidence:.2f}", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        # Draw head pose angles
        head_pose = detection['head_pose']
        cv2.putText(frame, f"Yaw: {head_pose['yaw']:.1f}°", (10, 90), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"Pitch: {head_pose['pitch']:.1f}°", (10, 110), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Draw Eye Aspect Ratio
        ear = detection.get('eye_aspect_ratio', 0)
        cv2.putText(frame, f"EAR: {ear:.3f}", (10, 130), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Draw active timers
        if 'timers' in detection:
            timers = detection['timers']
            y_offset = 150
            for timer_name, timer_value in timers.items():
                if timer_value > 0:
                    cv2.putText(frame, f"{timer_name}: {timer_value:.1f}s", (10, y_offset), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 0), 1)
                    y_offset += 20

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

@app.get("/analytics/session")
async def get_session_analytics():
    """Get current session analytics and state history"""
    return camera_manager.detector.get_session_summary()

@app.post("/analytics/reset")
async def reset_session():
    """Reset the current session analytics"""
    camera_manager.detector.state_history = []
    camera_manager.detector.current_state = 'focused'
    camera_manager.detector.state_start_time = datetime.now()
    return {"success": True, "message": "Session reset"}

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
    print("� Starting AI Study Assistant Backend (Enhanced)")
    print("📹 Computer Vision: Advanced OpenCV with PnP head pose estimation")  
    print("🧠 AI Features: State machine with timer-based transitions")
    print("📊 Analytics: Session tracking and productivity insights")
    print("🌐 Server: http://127.0.0.1:8000")
    print("🔌 WebSocket: ws://127.0.0.1:8000/ws/camera")
    print("� Analytics API: /analytics/session")
    print("💡 States: FOCUSED → DISTRACTED → RELAXING → DROWSY")
    print("")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
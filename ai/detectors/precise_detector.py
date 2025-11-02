"""
Precise AI State Detector using MediaPipe Face Mesh
Implements high-accuracy face landmark detection for precise head pose and eye tracking
"""

import cv2
import numpy as np
import mediapipe as mp
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime
import logging
import math

logger = logging.getLogger(__name__)

class PreciseStateDetector:
    """
    High-precision AI state detector using MediaPipe Face Mesh
    Provides accurate head pose estimation and eye aspect ratio calculation
    """
    
    def __init__(self, ai_thresholds=None):
        # Initialize MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Face mesh landmark indices for key points
        self.FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
        
        # Eye landmark indices (MediaPipe 468 landmarks)
        self.LEFT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
        self.RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
        
        # More precise eye landmarks for EAR calculation
        self.LEFT_EYE_CORNERS = [33, 133]  # Left and right corners
        self.LEFT_EYE_VERTICAL = [159, 145]  # Top and bottom points
        self.RIGHT_EYE_CORNERS = [362, 263] # Left and right corners  
        self.RIGHT_EYE_VERTICAL = [386, 374] # Top and bottom points
        
        # Nose tip and chin for head pose
        self.NOSE_TIP = 1
        self.CHIN = 18
        
        # 3D model points for head pose estimation (more accurate)
        self.model_points_3d = np.array([
            (0.0, 0.0, 0.0),      # Nose tip
            (0.0, -63.6, -12.5),  # Chin  
            (-43.3, 32.7, -26.0), # Left eye left corner
            (43.3, 32.7, -26.0),  # Right eye right corner
            (-28.9, -28.9, -24.1), # Left Mouth corner
            (28.9, -28.9, -24.1)   # Right mouth corner
        ], dtype=np.float64)
        
        # Camera parameters
        self.camera_matrix = None
        self.dist_coeffs = np.zeros((4, 1))
        
        # State machine
        self.current_state = 'focused'
        self.state_start_time = datetime.now()
        self.last_frame_time = datetime.now()
        
        # Timers
        self.drowsy_timer = 0
        self.distracted_timer = 0
        self.relaxing_timer = 0
        
        # Configure thresholds
        self.configure_thresholds(ai_thresholds)
        
        # Calibration data
        self.is_calibrated = False
        self.neutral_pose = None
        self.calibration_frames = []
        
        # State history
        self.state_history = []
        
        # Detection quality metrics
        self.face_detection_confidence = 0.0
        self.landmark_quality = 0.0
        
    def configure_thresholds(self, ai_thresholds=None):
        """Configure detection thresholds - much more precise now"""
        if ai_thresholds:
            # Use provided thresholds
            self.DROWSY_EAR_THRESHOLD = ai_thresholds.drowsy_ear_threshold
            self.DROWSY_TIME_THRESHOLD = ai_thresholds.drowsy_time_threshold
            self.DROWSY_GRACE_PERIOD = ai_thresholds.drowsy_grace_period
            
            self.DISTRACTED_PITCH_THRESHOLD = ai_thresholds.distracted_pitch_threshold
            self.DISTRACTED_TIME_THRESHOLD = ai_thresholds.distracted_time_threshold
            self.DISTRACTED_GRACE_PERIOD = ai_thresholds.distracted_grace_period
            
            self.RELAXING_YAW_THRESHOLD = ai_thresholds.relaxing_yaw_threshold
            self.RELAXING_TIME_THRESHOLD = ai_thresholds.relaxing_time_threshold
            self.RELAXING_GRACE_PERIOD = ai_thresholds.relaxing_grace_period
        else:
            # Balanced thresholds for simplified head pose calculation
            self.DROWSY_EAR_THRESHOLD = 0.2   # Eye aspect ratio for closed eyes
            self.DROWSY_TIME_THRESHOLD = 2.5  # Seconds of closed eyes
            self.DROWSY_GRACE_PERIOD = 1.0
            
            self.DISTRACTED_PITCH_THRESHOLD = 25  # Looking down (phone/desk)
            self.DISTRACTED_YAW_THRESHOLD = 30    # Looking sideways significantly  
            self.DISTRACTED_TIME_THRESHOLD = 6.0  # Longer time to avoid false positives
            self.DISTRACTED_GRACE_PERIOD = 2.0
            
            self.RELAXING_YAW_THRESHOLD = 15      # Gentle look away
            self.RELAXING_PITCH_UP_THRESHOLD = -15 # Looking up slightly
            self.RELAXING_TIME_THRESHOLD = 10.0   # Longer time for relaxing state
            self.RELAXING_GRACE_PERIOD = 3.0

    def initialize_camera_matrix(self, frame_shape: Tuple[int, int]):
        """Initialize camera matrix for head pose estimation"""
        height, width = frame_shape[:2]
        
        # More accurate camera matrix estimation
        focal_length = width * 1.2  # Slightly adjusted for better accuracy
        center = (width / 2, height / 2)
        
        self.camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]], 
            [0, 0, 1]
        ], dtype=np.float64)

    def extract_landmarks(self, landmarks, indices: List[int], frame_shape: Tuple[int, int]) -> np.ndarray:
        """Extract specific landmark points and convert to pixel coordinates"""
        height, width = frame_shape[:2]
        points = []
        
        for idx in indices:
            if idx < len(landmarks.landmark):
                lm = landmarks.landmark[idx]
                x = int(lm.x * width)
                y = int(lm.y * height)
                points.append([x, y])
        
        return np.array(points, dtype=np.float64)

    def calculate_precise_ear(self, landmarks, frame_shape: Tuple[int, int]) -> float:
        """Calculate Eye Aspect Ratio using precise MediaPipe landmarks"""
        try:
            height, width = frame_shape[:2]
            
            # Left eye landmarks
            left_eye_corners = []
            left_eye_vertical = []
            
            for idx in [362, 263]:  # Left eye corners
                lm = landmarks.landmark[idx]
                left_eye_corners.append([lm.x * width, lm.y * height])
                
            for idx in [386, 374]:  # Left eye vertical points
                lm = landmarks.landmark[idx]
                left_eye_vertical.append([lm.x * width, lm.y * height])
            
            # Right eye landmarks  
            right_eye_corners = []
            right_eye_vertical = []
            
            for idx in [33, 133]:  # Right eye corners
                lm = landmarks.landmark[idx]
                right_eye_corners.append([lm.x * width, lm.y * height])
                
            for idx in [159, 145]:  # Right eye vertical points
                lm = landmarks.landmark[idx]
                right_eye_vertical.append([lm.x * width, lm.y * height])
            
            # Calculate EAR for each eye
            def eye_aspect_ratio(corners, vertical):
                if len(corners) < 2 or len(vertical) < 2:
                    return 0.0
                
                # Vertical distance
                v_dist = np.linalg.norm(np.array(vertical[0]) - np.array(vertical[1]))
                # Horizontal distance  
                h_dist = np.linalg.norm(np.array(corners[0]) - np.array(corners[1]))
                
                if h_dist == 0:
                    return 0.0
                    
                return v_dist / h_dist
            
            left_ear = eye_aspect_ratio(left_eye_corners, left_eye_vertical)
            right_ear = eye_aspect_ratio(right_eye_corners, right_eye_vertical)
            
            # Average both eyes
            avg_ear = (left_ear + right_ear) / 2.0
            
            return avg_ear
            
        except Exception as e:
            logger.warning(f"EAR calculation error: {e}")
            return 0.0

    def calculate_precise_head_pose(self, landmarks, frame_shape: Tuple[int, int]) -> Dict[str, float]:
        """Calculate precise head pose using MediaPipe landmarks and simplified approach"""
        try:
            height, width = frame_shape[:2]
            
            # Get key landmark points
            nose_tip = landmarks.landmark[1]
            chin = landmarks.landmark[18]
            left_eye = landmarks.landmark[33]
            right_eye = landmarks.landmark[362]
            
            # Convert to pixel coordinates
            nose_x, nose_y = int(nose_tip.x * width), int(nose_tip.y * height)
            chin_x, chin_y = int(chin.x * width), int(chin.y * height)
            left_eye_x, left_eye_y = int(left_eye.x * width), int(left_eye.y * height)
            right_eye_x, right_eye_y = int(right_eye.x * width), int(right_eye.y * height)
            
            # Calculate face center
            face_center_x = (left_eye_x + right_eye_x) // 2
            face_center_y = (left_eye_y + right_eye_y) // 2
            
            # Calculate simplified head pose angles
            
            # YAW (left-right): based on nose position relative to eye center
            eye_center_x = (left_eye_x + right_eye_x) // 2
            nose_offset_x = nose_x - eye_center_x
            
            # Normalize yaw based on eye distance
            eye_distance = abs(right_eye_x - left_eye_x)
            if eye_distance > 0:
                yaw_ratio = nose_offset_x / (eye_distance * 0.5)
                yaw_deg = np.clip(yaw_ratio * 30, -60, 60)  # Scale to reasonable range
            else:
                yaw_deg = 0
            
            # PITCH (up-down): based on nose-chin vertical alignment
            face_height = abs(chin_y - face_center_y)
            if face_height > 0:
                # When looking down, chin appears closer to nose
                # When looking up, chin appears farther from nose
                expected_chin_y = face_center_y + face_height
                pitch_offset = chin_y - expected_chin_y
                pitch_ratio = pitch_offset / face_height
                pitch_deg = np.clip(pitch_ratio * 45, -45, 45)  # Scale to reasonable range
            else:
                pitch_deg = 0
            
            # ROLL: based on eye level alignment
            if abs(right_eye_x - left_eye_x) > 5:  # Avoid division by small numbers
                eye_slope = (right_eye_y - left_eye_y) / (right_eye_x - left_eye_x)
                roll_deg = np.clip(math.degrees(math.atan(eye_slope)), -30, 30)
            else:
                roll_deg = 0
            
            # Quality based on face size and landmark visibility
            face_area = eye_distance * face_height
            min_face_area = (width * height) * 0.02  # 2% of frame
            quality = min(1.0, face_area / min_face_area) if min_face_area > 0 else 0
            
            return {
                'pitch': float(pitch_deg),
                'yaw': float(yaw_deg), 
                'roll': float(roll_deg),
                'quality': float(np.clip(quality, 0, 1))
            }
            
        except Exception as e:
            logger.warning(f"Head pose calculation error: {e}")
            return {'pitch': 0.0, 'yaw': 0.0, 'roll': 0.0, 'quality': 0.0}

    def update_precise_state_machine(self, head_pose: Dict[str, float], ear: float) -> str:
        """Enhanced state machine with stable detection logic"""
        current_time = datetime.now()
        dt = (current_time - self.last_frame_time).total_seconds()
        self.last_frame_time = current_time
        
        pitch = head_pose['pitch']
        yaw = head_pose['yaw']
        pose_quality = head_pose.get('quality', 0)
        
        # Only proceed with reasonable quality pose detection
        if pose_quality < 0.3:
            return self._transition_to_state('unknown')
        
        # Add stability - small movements shouldn't trigger state changes
        STABILITY_BUFFER = 5  # degrees of tolerance
        
        # Reset all timers first
        reset_drowsy = True
        reset_distracted = True  
        reset_relaxing = True
        
        # 1. Check for drowsiness (eyes closed) - Highest priority
        if ear > 0 and ear < self.DROWSY_EAR_THRESHOLD:
            self.drowsy_timer += dt
            reset_drowsy = False
            
            if self.drowsy_timer >= self.DROWSY_TIME_THRESHOLD:
                self._reset_other_timers(['drowsy'])
                return self._transition_to_state('drowsy')
        
        # 2. Check for relaxing (looking away or down for brief breaks) - Medium priority
        pitch_down_relaxing = pitch > (self.DISTRACTED_PITCH_THRESHOLD + STABILITY_BUFFER)  # Looking down = relaxing
        pitch_up_relaxing = pitch < (self.RELAXING_PITCH_UP_THRESHOLD - STABILITY_BUFFER)   # Looking up = relaxing
        yaw_relaxing = (abs(yaw) > (self.RELAXING_YAW_THRESHOLD + STABILITY_BUFFER) and 
                       abs(yaw) < (self.DISTRACTED_YAW_THRESHOLD + STABILITY_BUFFER))       # Gentle side look = relaxing
        
        if pitch_down_relaxing or pitch_up_relaxing or yaw_relaxing:
            self.relaxing_timer += dt
            reset_relaxing = False
            
            if self.relaxing_timer >= self.RELAXING_TIME_THRESHOLD:
                self._reset_other_timers(['relaxing'])
                return self._transition_to_state('relaxing')
        
        # 3. Check for distraction (only extreme sideways look) - High priority
        # Only very extreme yaw movements are considered distraction now
        extreme_yaw_distracted = abs(yaw) > (self.DISTRACTED_YAW_THRESHOLD + STABILITY_BUFFER + 15)  # Extra 15° buffer
        
        if extreme_yaw_distracted:
            self.distracted_timer += dt
            reset_distracted = False
            
            if self.distracted_timer >= self.DISTRACTED_TIME_THRESHOLD:
                self._reset_other_timers(['distracted'])
                return self._transition_to_state('distracted')
        
        # Reset timers for conditions not met
        if reset_drowsy:
            self.drowsy_timer = max(0, self.drowsy_timer - dt * 2)  # Gradual decay
        if reset_distracted:
            self.distracted_timer = max(0, self.distracted_timer - dt * 2)  # Gradual decay
        if reset_relaxing:
            self.relaxing_timer = max(0, self.relaxing_timer - dt * 2)  # Gradual decay
            
        # 4. Default to focused if no other conditions
        return self._transition_to_state('focused')
    
    def _reset_other_timers(self, keep: List[str]):
        """Reset timers except for the ones specified in keep"""
        if 'drowsy' not in keep:
            self.drowsy_timer = 0
        if 'distracted' not in keep:
            self.distracted_timer = 0
        if 'relaxing' not in keep:
            self.relaxing_timer = 0

    def _transition_to_state(self, new_state: str) -> str:
        """Handle state transitions with logging"""
        if new_state != self.current_state:
            duration = (datetime.now() - self.state_start_time).total_seconds()
            
            self.state_history.append({
                'state': self.current_state,
                'duration': duration,
                'timestamp': self.state_start_time.isoformat(),
                'end_time': datetime.now().isoformat()
            })
            
            logger.info(f"State transition: {self.current_state} -> {new_state} (duration: {duration:.1f}s)")
            
            self.current_state = new_state
            self.state_start_time = datetime.now()
        
        return new_state

    def detect_state(self, frame: np.ndarray) -> Dict[str, Any]:
        """Main detection method using MediaPipe Face Mesh"""
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)
        
        if not results.multi_face_landmarks:
            return {
                'state': 'unknown',
                'confidence': 0.0,
                'head_pose': {'pitch': 0, 'yaw': 0, 'roll': 0, 'quality': 0},
                'eye_aspect_ratio': 0.0,
                'face_detected': False,
                'landmark_count': 0,
                'detection_quality': 'No face detected',
                'timers': {
                    'drowsy': self.drowsy_timer,
                    'distracted': self.distracted_timer,
                    'relaxing': self.relaxing_timer
                }
            }
        
        # Get the first (and should be only) face
        face_landmarks = results.multi_face_landmarks[0]
        
        # Calculate metrics
        head_pose = self.calculate_precise_head_pose(face_landmarks, frame.shape)
        ear = self.calculate_precise_ear(face_landmarks, frame.shape)
        
        # Update state machine
        current_state = self.update_precise_state_machine(head_pose, ear)
        
        # Calculate detection confidence based on landmark quality
        landmark_count = len(face_landmarks.landmark)
        self.face_detection_confidence = min(1.0, landmark_count / 468.0)  # MediaPipe has 468 landmarks
        
        # Determine detection quality
        quality_desc = "Excellent" if self.face_detection_confidence > 0.9 else \
                      "Good" if self.face_detection_confidence > 0.7 else \
                      "Fair" if self.face_detection_confidence > 0.5 else "Poor"
        
        return {
            'state': current_state,
            'confidence': self.face_detection_confidence,
            'head_pose': head_pose,
            'eye_aspect_ratio': ear,
            'face_detected': True,
            'landmark_count': landmark_count,
            'detection_quality': quality_desc,
            'timers': {
                'drowsy': self.drowsy_timer,
                'distracted': self.distracted_timer,
                'relaxing': self.relaxing_timer
            },
            'thresholds': {
                'drowsy_ear': self.DROWSY_EAR_THRESHOLD,
                'distracted_pitch': self.DISTRACTED_PITCH_THRESHOLD,
                'distracted_yaw': self.DISTRACTED_YAW_THRESHOLD,
                'relaxing_yaw': self.RELAXING_YAW_THRESHOLD,
                'relaxing_pitch_up': self.RELAXING_PITCH_UP_THRESHOLD
            },
            'raw_angles': {
                'pitch': head_pose['pitch'],
                'yaw': head_pose['yaw'],
                'roll': head_pose['roll']
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def draw_debug_overlay(self, frame: np.ndarray, detection_result: Dict[str, Any]):
        """Draw detailed debug information on the frame"""
        if not detection_result.get('face_detected', False):
            cv2.putText(frame, "NO FACE DETECTED", (10, 50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            return
        
        # State and confidence
        state = detection_result['state']
        confidence = detection_result['confidence']
        
        color_map = {
            'focused': (0, 255, 0),
            'relaxing': (255, 255, 0),
            'distracted': (0, 165, 255),
            'drowsy': (0, 0, 255),
            'unknown': (128, 128, 128)
        }
        
        color = color_map.get(state, (128, 128, 128))
        
        # Main state display
        cv2.putText(frame, f"State: {state.upper()}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        
        # Show actual angles for debugging
        head_pose = detection_result['head_pose']
        cv2.putText(frame, f"Pitch: {head_pose['pitch']:.1f}° Yaw: {head_pose['yaw']:.1f}°", 
                   (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        # Show thresholds for comparison
        thresholds = detection_result.get('thresholds', {})
        cv2.putText(frame, f"Dist Thresh: P>{thresholds.get('distracted_pitch', 0):.0f}° Y>{thresholds.get('distracted_yaw', 0):.0f}°", 
                   (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        
        # Detection quality
        quality = detection_result['detection_quality']
        cv2.putText(frame, f"Quality: {quality}", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        # Detailed angles
        head_pose = detection_result['head_pose']
        cv2.putText(frame, f"Pitch: {head_pose['pitch']:.1f}° ({'DOWN' if head_pose['pitch'] > 15 else 'UP' if head_pose['pitch'] < -10 else 'LEVEL'})", 
                   (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"Yaw: {head_pose['yaw']:.1f}° ({'RIGHT' if head_pose['yaw'] > 15 else 'LEFT' if head_pose['yaw'] < -15 else 'CENTER'})", 
                   (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Eye Aspect Ratio with interpretation
        ear = detection_result['eye_aspect_ratio']
        ear_status = "CLOSED" if ear < 0.25 else "OPEN"
        cv2.putText(frame, f"Eyes: {ear:.3f} ({ear_status})", (10, 130), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Active timers
        timers = detection_result['timers']
        y_offset = 150
        for timer_name, timer_value in timers.items():
            if timer_value > 0:
                cv2.putText(frame, f"{timer_name}: {timer_value:.1f}s", (10, y_offset), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 0), 1)
                y_offset += 20

    def get_session_summary(self) -> Dict[str, Any]:
        """Get summary of current detection session"""
        total_time = sum(entry['duration'] for entry in self.state_history)
        
        state_durations = {}
        for entry in self.state_history:
            state = entry['state']
            state_durations[state] = state_durations.get(state, 0) + entry['duration']
        
        return {
            'total_session_time': total_time,
            'state_durations': state_durations,
            'state_percentages': {k: (v/total_time)*100 if total_time > 0 else 0 
                                for k, v in state_durations.items()},
            'state_transitions': len(self.state_history),
            'current_state': self.current_state,
            'detection_method': 'MediaPipe Face Mesh (High Precision)',
            'history': self.state_history
        }
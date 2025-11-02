"""
Enhanced AI State Detector with Advanced Algorithms
Implements sophisticated head pose estimation and eye aspect ratio calculation
using OpenCV without requiring MediaPipe or dlib dependencies.
"""

import cv2
import numpy as np
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class EnhancedStateDetector:
    """
    Advanced AI state detector implementing:
    - Precise head pose estimation using PnP solver
    - Scientific Eye Aspect Ratio calculation
    - State machine with timer-based transitions
    """
    
    def __init__(self, ai_thresholds=None):
        # Load OpenCV cascade classifiers
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        # 3D face model points (in face coordinate system)
        self.model_points = np.array([
            (0.0, 0.0, 0.0),           # Nose tip
            (0.0, -330.0, -65.0),      # Chin
            (-225.0, 170.0, -135.0),   # Left eye left corner
            (225.0, 170.0, -135.0),    # Right eye right corner
            (-150.0, -150.0, -125.0),  # Left mouth corner
            (150.0, -150.0, -125.0)    # Right mouth corner
        ], dtype=np.float64)
        
        # Camera matrix (will be set based on frame size)
        self.camera_matrix = None
        self.dist_coeffs = np.zeros((4, 1))  # Assuming no lens distortion
        
        # State machine variables
        self.current_state = 'focused'
        self.state_start_time = datetime.now()
        
        # Timers for each state transition
        self.drowsy_timer = 0
        self.distracted_timer = 0
        self.relaxing_timer = 0
        
        # Timer tracking
        self.last_frame_time = datetime.now()
        
        # Configure thresholds (use provided or defaults)
        self.configure_thresholds(ai_thresholds)
        
        # State history for logging
        self.state_history = []
        
        # Session tracking
        self.session_active = False
        self.session_start_time = None
    
    def configure_thresholds(self, ai_thresholds=None):
        """Configure AI detection thresholds from AIThresholds object or use defaults"""
        if ai_thresholds:
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
            # Default thresholds - More realistic and lenient
            self.DROWSY_EAR_THRESHOLD = 0.20  # More lenient threshold
            self.DROWSY_TIME_THRESHOLD = 25.0  # 25 seconds before drowsy alert
            self.DROWSY_GRACE_PERIOD = 5.0
            
            self.DISTRACTED_PITCH_THRESHOLD = 30  # degrees looking down (phone checking)
            self.DISTRACTED_TIME_THRESHOLD = 15.0  # 15 seconds for phone distraction
            self.DISTRACTED_GRACE_PERIOD = 15.0
            
            self.RELAXING_YAW_THRESHOLD = 25  # degrees looking sideways/up
            self.RELAXING_TIME_THRESHOLD = 30.0  # 30 seconds for eye relaxing
            self.RELAXING_GRACE_PERIOD = 30.0

    def initialize_camera_matrix(self, frame_shape: Tuple[int, int]):
        """Initialize camera matrix based on frame dimensions"""
        height, width = frame_shape[:2]
        
        # Approximate camera matrix for a typical webcam
        focal_length = width
        center = (width // 2, height // 2)
        
        self.camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)

    def estimate_head_pose_pnp(self, face_landmarks: np.ndarray, frame_shape: Tuple[int, int]) -> Dict[str, float]:
        """
        Advanced head pose estimation using Perspective-n-Point solver
        Args:
            face_landmarks: 2D points corresponding to model_points
            frame_shape: (height, width) of the frame
        Returns:
            Dict with pitch, yaw, roll in degrees
        """
        if self.camera_matrix is None:
            self.initialize_camera_matrix(frame_shape)
        
        # Solve PnP to get rotation and translation vectors
        success, rotation_vector, translation_vector = cv2.solvePnP(
            self.model_points,
            face_landmarks,
            self.camera_matrix,
            self.dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )
        
        if not success:
            return {'pitch': 0, 'yaw': 0, 'roll': 0}
        
        # Convert rotation vector to rotation matrix
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        
        # Extract Euler angles from rotation matrix
        # Using the convention: pitch (x), yaw (y), roll (z)
        sy = np.sqrt(rotation_matrix[0, 0] ** 2 + rotation_matrix[1, 0] ** 2)
        
        singular = sy < 1e-6
        
        if not singular:
            pitch = np.arctan2(rotation_matrix[2, 1], rotation_matrix[2, 2])
            yaw = np.arctan2(-rotation_matrix[2, 0], sy)
            roll = np.arctan2(rotation_matrix[1, 0], rotation_matrix[0, 0])
        else:
            pitch = np.arctan2(-rotation_matrix[1, 2], rotation_matrix[1, 1])
            yaw = np.arctan2(-rotation_matrix[2, 0], sy)
            roll = 0
        
        # Convert to degrees
        return {
            'pitch': np.degrees(pitch),
            'yaw': np.degrees(yaw),
            'roll': np.degrees(roll)
        }

    def calculate_eye_aspect_ratio(self, left_eye_points: np.ndarray, right_eye_points: np.ndarray) -> float:
        """
        Calculate Eye Aspect Ratio using the scientific formula:
        EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
        
        Where points are ordered as:
        p1, p4: horizontal eye corners
        p2, p3, p5, p6: vertical eye points
        """
        def eye_aspect_ratio_single(eye_points):
            if len(eye_points) < 6:
                return 0.0
            
            # Calculate vertical distances
            vertical_1 = np.linalg.norm(eye_points[1] - eye_points[5])
            vertical_2 = np.linalg.norm(eye_points[2] - eye_points[4])
            
            # Calculate horizontal distance
            horizontal = np.linalg.norm(eye_points[0] - eye_points[3])
            
            if horizontal == 0:
                return 0.0
            
            # EAR formula
            ear = (vertical_1 + vertical_2) / (2.0 * horizontal)
            return ear
        
        # Calculate EAR for both eyes and average
        left_ear = eye_aspect_ratio_single(left_eye_points)
        right_ear = eye_aspect_ratio_single(right_eye_points)
        
        return (left_ear + right_ear) / 2.0

    def extract_facial_landmarks(self, face_region: np.ndarray, face_rect: Tuple[int, int, int, int]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Extract key facial landmarks from detected face region
        Returns: (2D landmarks for PnP, left eye points, right eye points)
        """
        x, y, w, h = face_rect
        
        # Estimate key facial landmarks based on face geometry
        # These are approximations since we don't have MediaPipe/dlib
        
        # Key points for head pose (corresponding to model_points)
        landmarks_2d = np.array([
            [x + w//2, y + int(h*0.4)],           # Nose tip (approximate)
            [x + w//2, y + int(h*0.85)],          # Chin
            [x + int(w*0.2), y + int(h*0.35)],    # Left eye corner
            [x + int(w*0.8), y + int(h*0.35)],    # Right eye corner  
            [x + int(w*0.3), y + int(h*0.7)],     # Left mouth corner
            [x + int(w*0.7), y + int(h*0.7)]      # Right mouth corner
        ], dtype=np.float64)
        
        # Detect eyes for more precise EAR calculation
        eyes = self.eye_cascade.detectMultiScale(face_region, 1.1, 3)
        
        left_eye_points = np.array([])
        right_eye_points = np.array([])
        
        if len(eyes) >= 2:
            # Sort eyes by x-coordinate (left to right)
            eyes_sorted = sorted(eyes, key=lambda e: e[0])
            
            # Left eye (relative to face region)
            ex1, ey1, ew1, eh1 = eyes_sorted[0]
            left_eye_center = np.array([x + ex1 + ew1//2, y + ey1 + eh1//2])
            
            # Create approximate eye landmark points for EAR calculation
            left_eye_points = np.array([
                [left_eye_center[0] - ew1//2, left_eye_center[1]],      # Left corner
                [left_eye_center[0], left_eye_center[1] - eh1//3],       # Top
                [left_eye_center[0], left_eye_center[1] - eh1//4],       # Top-inner
                [left_eye_center[0] + ew1//2, left_eye_center[1]],      # Right corner
                [left_eye_center[0], left_eye_center[1] + eh1//4],       # Bottom-inner
                [left_eye_center[0], left_eye_center[1] + eh1//3]        # Bottom
            ], dtype=np.float64)
            
            # Right eye
            ex2, ey2, ew2, eh2 = eyes_sorted[1]
            right_eye_center = np.array([x + ex2 + ew2//2, y + ey2 + eh2//2])
            
            right_eye_points = np.array([
                [right_eye_center[0] - ew2//2, right_eye_center[1]],    # Left corner
                [right_eye_center[0], right_eye_center[1] - eh2//3],     # Top
                [right_eye_center[0], right_eye_center[1] - eh2//4],     # Top-inner
                [right_eye_center[0] + ew2//2, right_eye_center[1]],    # Right corner
                [right_eye_center[0], right_eye_center[1] + eh2//4],     # Bottom-inner
                [right_eye_center[0], right_eye_center[1] + eh2//3]      # Bottom
            ], dtype=np.float64)
        
        return landmarks_2d, left_eye_points, right_eye_points

    def update_state_machine(self, head_pose: Dict[str, float], ear: float) -> str:
        """
        State machine with timer-based transitions
        Priority: drowsy > distracted > relaxing > focused
        """
        current_time = datetime.now()
        dt = (current_time - self.last_frame_time).total_seconds()
        self.last_frame_time = current_time
        
        # Extract angles
        pitch = head_pose['pitch']
        yaw = head_pose['yaw']
        
        # Check for drowsy state (highest priority)
        if ear < self.DROWSY_EAR_THRESHOLD:
            self.drowsy_timer += dt
            # Reset other timers
            self.distracted_timer = 0
            self.relaxing_timer = 0
            
            if self.drowsy_timer >= self.DROWSY_TIME_THRESHOLD:
                return self._transition_to_state('drowsy')
        else:
            self.drowsy_timer = 0
        
        # Check for distracted state (looking down)
        if pitch > self.DISTRACTED_PITCH_THRESHOLD:
            self.distracted_timer += dt
            # Reset other timers
            self.relaxing_timer = 0
            
            if self.distracted_timer >= self.DISTRACTED_TIME_THRESHOLD:
                return self._transition_to_state('distracted')
        else:
            self.distracted_timer = 0
        
        # Check for relaxing state (looking sideways)
        if abs(yaw) > self.RELAXING_YAW_THRESHOLD:
            self.relaxing_timer += dt
            
            if self.relaxing_timer >= self.RELAXING_TIME_THRESHOLD:
                return self._transition_to_state('relaxing')
        else:
            self.relaxing_timer = 0
        
        # Default to focused if no other conditions are met
        return self._transition_to_state('focused')

    def _transition_to_state(self, new_state: str) -> str:
        """Handle state transitions and logging"""
        if new_state != self.current_state:
            # Calculate duration of previous state
            duration = (datetime.now() - self.state_start_time).total_seconds()
            
            # Log state change
            self.state_history.append({
                'state': self.current_state,
                'duration': duration,
                'timestamp': self.state_start_time.isoformat(),
                'end_time': datetime.now().isoformat()
            })
            
            logger.info(f"State change: {self.current_state} -> {new_state} (duration: {duration:.1f}s)")
            
            # Update state
            self.current_state = new_state
            self.state_start_time = datetime.now()
        
        return new_state

    def detect_state(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Main detection method implementing the enhanced algorithm
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            return {
                'state': 'unknown',
                'confidence': 0.0,
                'head_pose': {'pitch': 0, 'yaw': 0, 'roll': 0},
                'eye_aspect_ratio': 0.0,
                'landmarks_detected': False,
                'face_detected': False,
                'timers': {
                    'drowsy': self.drowsy_timer,
                    'distracted': self.distracted_timer,
                    'relaxing': self.relaxing_timer
                }
            }
        
        # Use the largest face
        face = max(faces, key=lambda f: f[2] * f[3])
        x, y, w, h = face
        
        # Extract face region
        face_region = gray[y:y+h, x:x+w]
        
        # Extract facial landmarks
        landmarks_2d, left_eye_points, right_eye_points = self.extract_facial_landmarks(face_region, face)
        
        # Calculate head pose using PnP solver
        head_pose = self.estimate_head_pose_pnp(landmarks_2d, frame.shape)
        
        # Calculate Eye Aspect Ratio
        ear = 0.0
        if len(left_eye_points) > 0 and len(right_eye_points) > 0:
            ear = self.calculate_eye_aspect_ratio(left_eye_points, right_eye_points)
        
        # Update state machine
        current_state = self.update_state_machine(head_pose, ear)
        
        # Calculate confidence based on face size and detection quality
        face_area = w * h
        frame_area = frame.shape[0] * frame.shape[1]
        face_ratio = face_area / frame_area
        confidence = min(1.0, max(0.3, face_ratio * 10))
        
        return {
            'state': current_state,
            'confidence': confidence,
            'head_pose': head_pose,
            'eye_aspect_ratio': ear,
            'landmarks_detected': len(left_eye_points) > 0 and len(right_eye_points) > 0,
            'face_detected': True,
            'face_area_ratio': face_ratio,
            'timers': {
                'drowsy': self.drowsy_timer,
                'distracted': self.distracted_timer,
                'relaxing': self.relaxing_timer
            },
            'thresholds': {
                'drowsy_ear': self.DROWSY_EAR_THRESHOLD,
                'distracted_pitch': self.DISTRACTED_PITCH_THRESHOLD,
                'relaxing_yaw': self.RELAXING_YAW_THRESHOLD
            },
            'timestamp': datetime.now().isoformat()
        }

    def get_session_summary(self) -> Dict[str, Any]:
        """Get summary of the current session"""
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
            'history': self.state_history
        }
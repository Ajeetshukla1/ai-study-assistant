"""
Session Configuration and User Preferences
Handles study session setup, AI thresholds, and user customization
"""

from typing import Dict, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
import json

@dataclass
class AIThresholds:
    """User-configurable AI detection thresholds"""
    drowsy_ear_threshold: float = 0.20
    drowsy_time_threshold: float = 25.0  # seconds
    drowsy_grace_period: float = 5.0
    
    distracted_pitch_threshold: float = 30.0  # degrees
    distracted_time_threshold: float = 15.0  # seconds  
    distracted_grace_period: float = 15.0
    
    relaxing_yaw_threshold: float = 25.0  # degrees
    relaxing_time_threshold: float = 30.0  # seconds
    relaxing_grace_period: float = 30.0

@dataclass 
class BreakSchedule:
    """Break configuration for study sessions"""
    break_count: int = 2           # Number of breaks
    break_duration: int = 3        # Minutes per break
    break_interval: int = 45       # Minutes between breaks

@dataclass
class SessionConfig:
    """Complete study session configuration"""
    duration_minutes: int = 120    # Total session duration
    ai_thresholds: AIThresholds = None
    break_schedule: BreakSchedule = None
    
    def __post_init__(self):
        if self.ai_thresholds is None:
            self.ai_thresholds = AIThresholds()
        if self.break_schedule is None:
            self.break_schedule = BreakSchedule()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API/database storage"""
        return {
            'duration_minutes': self.duration_minutes,
            'ai_thresholds': {
                'drowsy_ear_threshold': self.ai_thresholds.drowsy_ear_threshold,
                'drowsy_time_threshold': self.ai_thresholds.drowsy_time_threshold,
                'drowsy_grace_period': self.ai_thresholds.drowsy_grace_period,
                'distracted_pitch_threshold': self.ai_thresholds.distracted_pitch_threshold,
                'distracted_time_threshold': self.ai_thresholds.distracted_time_threshold,
                'distracted_grace_period': self.ai_thresholds.distracted_grace_period,
                'relaxing_yaw_threshold': self.ai_thresholds.relaxing_yaw_threshold,
                'relaxing_time_threshold': self.ai_thresholds.relaxing_time_threshold,
                'relaxing_grace_period': self.ai_thresholds.relaxing_grace_period,
            },
            'break_schedule': {
                'break_count': self.break_schedule.break_count,
                'break_duration': self.break_schedule.break_duration,
                'break_interval': self.break_schedule.break_interval,
            }
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SessionConfig':
        """Create SessionConfig from dictionary"""
        ai_data = data.get('ai_thresholds', {})
        break_data = data.get('break_schedule', {})
        
        ai_thresholds = AIThresholds(**ai_data)
        break_schedule = BreakSchedule(**break_data)
        
        return cls(
            duration_minutes=data.get('duration_minutes', 120),
            ai_thresholds=ai_thresholds,
            break_schedule=break_schedule
        )

class SessionManager:
    """Manages active study sessions with timing and breaks"""
    
    def __init__(self, config: SessionConfig):
        self.config = config
        self.start_time = None
        self.end_time = None
        self.is_active = False
        self.is_paused = False
        self.break_times = []
        self.current_break = None
        
    def start_session(self) -> Dict[str, Any]:
        """Start a new study session"""
        self.start_time = datetime.now()
        self.end_time = self.start_time + timedelta(minutes=self.config.duration_minutes)
        self.is_active = True
        self.is_paused = False
        
        # Calculate break times
        self._calculate_break_schedule()
        
        return {
            'session_id': self._generate_session_id(),
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat(),
            'duration_minutes': self.config.duration_minutes,
            'break_times': [bt.isoformat() for bt in self.break_times],
            'config': self.config.to_dict()
        }
    
    def get_session_status(self) -> Dict[str, Any]:
        """Get current session status and timing"""
        if not self.is_active:
            return {'active': False}
        
        now = datetime.now()
        elapsed = (now - self.start_time).total_seconds() / 60  # minutes
        remaining = max(0, self.config.duration_minutes - elapsed)
        
        # Check if it's break time
        next_break = self._get_next_break_time(now)
        
        return {
            'active': True,
            'paused': self.is_paused,
            'elapsed_minutes': round(elapsed, 1),
            'remaining_minutes': round(remaining, 1),
            'progress_percentage': round((elapsed / self.config.duration_minutes) * 100, 1),
            'next_break': next_break.isoformat() if next_break else None,
            'current_break': self.current_break,
            'session_complete': remaining <= 0
        }
    
    def _calculate_break_schedule(self):
        """Calculate when breaks should occur during the session"""
        if self.config.break_schedule.break_count == 0:
            return
        
        interval_minutes = self.config.break_schedule.break_interval
        
        for i in range(self.config.break_schedule.break_count):
            break_time = self.start_time + timedelta(minutes=(i + 1) * interval_minutes)
            if break_time < self.end_time:
                self.break_times.append(break_time)
    
    def _get_next_break_time(self, current_time: datetime):
        """Get the next scheduled break time"""
        for break_time in self.break_times:
            if break_time > current_time:
                return break_time
        return None
    
    def _generate_session_id(self) -> str:
        """Generate unique session ID"""
        return f"session_{self.start_time.strftime('%Y%m%d_%H%M%S')}"

# Default configurations for different study modes
PRESET_CONFIGS = {
    'focused_study': SessionConfig(
        duration_minutes=90,
        ai_thresholds=AIThresholds(
            drowsy_time_threshold=20.0,
            distracted_time_threshold=10.0,
            relaxing_time_threshold=25.0
        ),
        break_schedule=BreakSchedule(break_count=1, break_duration=5, break_interval=45)
    ),
    
    'deep_work': SessionConfig(
        duration_minutes=120,
        ai_thresholds=AIThresholds(
            drowsy_time_threshold=30.0,
            distracted_time_threshold=15.0,
            relaxing_time_threshold=35.0
        ),
        break_schedule=BreakSchedule(break_count=2, break_duration=3, break_interval=40)
    ),
    
    'light_study': SessionConfig(
        duration_minutes=60,
        ai_thresholds=AIThresholds(
            drowsy_time_threshold=15.0,
            distracted_time_threshold=8.0,
            relaxing_time_threshold=20.0
        ),
        break_schedule=BreakSchedule(break_count=2, break_duration=2, break_interval=20)
    )
}
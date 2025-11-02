"""
AI Study Assistant - AI Package
Provides advanced computer vision and AI detection capabilities
"""

__version__ = "1.0.0"
__author__ = "AI Study Assistant Team"

# Import main classes for easy access
from .detectors.enhanced_detector import EnhancedStateDetector
from .config.session_config import SessionConfig, SessionManager, AIThresholds, PRESET_CONFIGS

try:
    from .detectors.precise_detector import PreciseStateDetector
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False

__all__ = [
    "EnhancedStateDetector",
    "SessionConfig", 
    "SessionManager",
    "AIThresholds",
    "PRESET_CONFIGS",
    "MEDIAPIPE_AVAILABLE"
]

if MEDIAPIPE_AVAILABLE:
    __all__.append("PreciseStateDetector")
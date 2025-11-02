"""
AI Detectors Package
Contains different AI detection implementations
"""

from .enhanced_detector import EnhancedStateDetector

try:
    from .precise_detector import PreciseStateDetector
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False

__all__ = ["EnhancedStateDetector"]

if MEDIAPIPE_AVAILABLE:
    __all__.append("PreciseStateDetector")
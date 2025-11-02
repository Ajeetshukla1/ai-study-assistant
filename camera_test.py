"""
Simple OpenCV Camera Test
Run this to test if your camera works with Python OpenCV
"""

import cv2
import numpy as np

def test_camera():
    print("🎥 Testing camera with OpenCV...")
    
    # Try to open the default camera (usually index 0)
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Error: Could not open camera")
        return
    
    print("✅ Camera opened successfully!")
    
    # Set camera properties
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    print("📹 Camera feed starting... Press 'q' to quit")
    
    while True:
        ret, frame = cap.read()
        
        if not ret:
            print("❌ Failed to grab frame")
            break
        
        # Flip horizontally for mirror effect
        frame = cv2.flip(frame, 1)
        
        # Add some text overlay
        cv2.putText(frame, 'OpenCV Camera Test', (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(frame, 'Press Q to quit', (10, 70), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Show the frame
        cv2.imshow('Camera Test', frame)
        
        # Check for 'q' key press
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    # Clean up
    cap.release()
    cv2.destroyAllWindows()
    print("✅ Camera test completed")

if __name__ == "__main__":
    try:
        test_camera()
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure OpenCV is installed: pip install opencv-python")
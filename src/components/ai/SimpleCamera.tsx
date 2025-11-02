'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { FocusState, AIDetectionResult, CameraState } from '@/types';

interface SimpleCameraProps {
  onStateChange: (result: AIDetectionResult) => void;
  isActive: boolean;
}

export function SimpleCamera({ onStateChange, isActive }: SimpleCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    hasPermission: false,
    error: null
  });
  
  const [videoLoaded, setVideoLoaded] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Mock AI detection that randomly changes states for demo purposes
  const mockDetection = useCallback(() => {
    if (!isActive) return;

    const states: FocusState[] = ['focused', 'relaxing', 'distracted', 'drowsy'];
    const randomState = states[Math.floor(Math.random() * states.length)];
    
    // Bias towards 'focused' state for better demo experience
    const biasedState = Math.random() < 0.6 ? 'focused' : randomState;
    
    const result: AIDetectionResult = {
      state: biasedState,
      confidence: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
      headPose: {
        pitch: (Math.random() - 0.5) * 60, // -30 to 30 degrees
        yaw: (Math.random() - 0.5) * 60,   // -30 to 30 degrees
        roll: (Math.random() - 0.5) * 20   // -10 to 10 degrees
      },
      eyeAspectRatio: Math.random() * 0.2 + 0.3 // 0.3 to 0.5
    };

    onStateChange(result);
  }, [isActive, onStateChange]);

  // Start camera
  const startCamera = async () => {
    try {
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      console.log('Camera stream obtained:', stream);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        streamRef.current = stream;
        
        // Set video properties
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        
        // Ensure video starts playing immediately
        video.onloadedmetadata = async () => {
          console.log('Video metadata loaded, starting playback...');
          try {
            await video.play();
            console.log('Video playing successfully');
            setVideoLoaded(true);
          } catch (err) {
            console.error('Failed to play video:', err);
          }
        };

        // Additional event listeners for debugging
        video.onplay = () => {
          console.log('Video started playing');
          setVideoLoaded(true);
        };
        
        video.oncanplay = () => {
          console.log('Video can start playing');
          setVideoLoaded(true);
        };
        
        video.onerror = (e) => console.error('Video error:', e);
        
        // Force play immediately if metadata is already loaded
        if (video.readyState >= 2) {
          video.play().catch(console.error);
          setVideoLoaded(true);
        }
      }

      setCameraState({
        isActive: true,
        hasPermission: true,
        error: null
      });

    } catch (error) {
      console.error('Camera access error:', error);
      setCameraState({
        isActive: false,
        hasPermission: false,
        error: error instanceof Error ? error.message : 'Failed to access camera'
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setVideoLoaded(false);
    setCameraState(prev => ({ ...prev, isActive: false }));
  };

  // Handle active state changes
  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive]);

  // Mock detection interval
  useEffect(() => {
    if (!isActive || !cameraState.isActive) return;

    const interval = setInterval(mockDetection, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, [isActive, cameraState.isActive, mockDetection]);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Status indicator */}
      <div className="mb-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            cameraState.isActive && videoLoaded ? 'bg-green-500' : 
            cameraState.isActive ? 'bg-yellow-500' :
            cameraState.error ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
          <span className="text-sm font-medium">
            {cameraState.isActive && videoLoaded ? 'Camera Active (Demo Mode)' :
             cameraState.isActive ? 'Camera Starting...' :
             cameraState.error ? 'Camera Error' : 'Initializing Camera...'}
          </span>
        </div>
        
        {cameraState.error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {cameraState.error}
          </p>
        )}

        {cameraState.isActive && (
          <div className="mt-1">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Demo Mode: AI detection is simulated. In the full version, this will use real face detection.
            </p>
            {videoLoaded && videoRef.current && (
              <p className="text-xs text-gray-500 mt-1">
                Video: {videoRef.current.videoWidth}x{videoRef.current.videoHeight} 
                {videoRef.current.paused ? ' (Paused)' : ' (Playing)'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Video container */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '300px' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // Mirror the video horizontally for better UX
            display: 'block'
          }}
        />
        
        {/* Demo overlay */}
        {cameraState.isActive && (
          <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            DEMO MODE
          </div>
        )}
        
        {/* Loading overlay */}
        {(!cameraState.isActive || !videoLoaded) && !cameraState.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="text-white text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
              <p>{!cameraState.isActive ? 'Starting camera...' : 'Loading video feed...'}</p>
            </div>
          </div>
        )}
        
        {/* Debug overlay - only show if video should be playing but isn't visible */}
        {cameraState.isActive && !videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-900 bg-opacity-50">
            <div className="text-white text-center p-4">
              <p className="font-medium">Video Stream Active</p>
              <p className="text-sm mt-1">Camera is connected but video may not be visible</p>
              <button
                onClick={() => {
                  if (videoRef.current) {
                    console.log('Manual play attempt');
                    videoRef.current.play().catch(console.error);
                  }
                }}
                className="mt-3 px-4 py-2 bg-white text-blue-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Force Play Video
              </button>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {cameraState.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-50">
            <div className="text-white text-center p-4">
              <p className="font-medium">Camera Access Required</p>
              <p className="text-sm mt-1">Please allow camera access to use the AI detection features</p>
              <button
                onClick={startCamera}
                className="mt-3 px-4 py-2 bg-white text-red-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p className="mb-2">
          <strong>Demo Instructions:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>This is a demo version with simulated AI detection</li>
          <li>The detection states will change automatically to show different focus levels</li>
          <li>In the full version, this will analyze your actual face and head pose</li>
          <li>Make sure to allow camera access when prompted</li>
        </ul>
      </div>
    </div>
  );
}
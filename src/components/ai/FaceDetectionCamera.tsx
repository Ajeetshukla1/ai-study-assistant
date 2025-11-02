'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { FaceMesh } from '@mediapipe/face_mesh';
import { AIStateDetector } from '@/utils/aiStateDetector';
import { FocusState, AIDetectionResult, CameraState } from '@/types';

interface FaceDetectionCameraProps {
  onStateChange: (result: AIDetectionResult) => void;
  isActive: boolean;
}

export function FaceDetectionCamera({ onStateChange, isActive }: FaceDetectionCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    hasPermission: false,
    error: null
  });

  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const aiDetectorRef = useRef<AIStateDetector | null>(null);

  // Initialize AI detector
  useEffect(() => {
    aiDetectorRef.current = new AIStateDetector();
  }, []);

  // Face mesh results callback
  const onResults = useCallback((results: any) => {
    if (!aiDetectorRef.current || !results.multiFaceLandmarks?.[0]) {
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const detectionResult = aiDetectorRef.current.analyzeFaceLandmarks(landmarks);
    
    // Draw landmarks on canvas for debugging (optional)
    drawLandmarks(results);
    
    // Notify parent component
    onStateChange(detectionResult);
  }, [onStateChange]);

  // Draw face landmarks on canvas
  const drawLandmarks = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.multiFaceLandmarks?.[0]) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // Draw face mesh points
      ctx.fillStyle = '#00FF00';
      landmarks.forEach((landmark: any) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        ctx.fillRect(x - 1, y - 1, 2, 2);
      });
      
      // Draw eye landmarks more prominently
      const eyeIndices = [33, 7, 163, 144, 145, 153, 362, 382, 381, 380, 374, 373];
      ctx.fillStyle = '#FF0000';
      eyeIndices.forEach(index => {
        if (landmarks[index]) {
          const x = landmarks[index].x * canvas.width;
          const y = landmarks[index].y * canvas.height;
          ctx.fillRect(x - 2, y - 2, 4, 4);
        }
      });
    }
  }, []);

  // Initialize MediaPipe Face Mesh
  useEffect(() => {
    const initializeFaceMesh = async () => {
      try {
        // Check if MediaPipe is available
        if (typeof FaceMesh === 'undefined') {
          throw new Error('MediaPipe FaceMesh is not available');
        }

        const faceMesh = new FaceMesh({
          locateFile: (file) => {
            // Use a more reliable CDN path
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
          }
        });

        // Set up the face mesh configuration
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false, // Disable to reduce load
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5
        });

        faceMesh.onResults(onResults);
        faceMeshRef.current = faceMesh;
        
        setCameraState(prev => ({ ...prev, error: null }));
        console.log('FaceMesh initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Face Mesh:', error);
        setCameraState(prev => ({ 
          ...prev, 
          error: `Failed to initialize AI model: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }));
      }
    };

    // Add a small delay to ensure the script is loaded
    const timer = setTimeout(() => {
      initializeFaceMesh();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onResults]);

  // Start camera when active
  useEffect(() => {
    if (!isActive || !faceMeshRef.current || !videoRef.current) {
      return;
    }

    const startCamera = async () => {
      try {
        const camera = new Camera(videoRef.current!, {
          onFrame: async () => {
            if (faceMeshRef.current && videoRef.current) {
              await faceMeshRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });

        await camera.start();
        cameraRef.current = camera;
        
        setCameraState(prev => ({
          ...prev,
          isActive: true,
          hasPermission: true,
          error: null
        }));
      } catch (error) {
        console.error('Failed to start camera:', error);
        setCameraState(prev => ({
          ...prev,
          isActive: false,
          hasPermission: false,
          error: 'Failed to access camera. Please ensure camera permissions are granted.'
        }));
      }
    };

    startCamera();

    // Cleanup function
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      setCameraState(prev => ({ ...prev, isActive: false }));
    };
  }, [isActive]);

  // Check browser support
  useEffect(() => {
    const checkSupport = () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState(prev => ({
          ...prev,
          error: 'Camera access is not supported in this browser'
        }));
        return;
      }

      if (!window.WebAssembly) {
        setCameraState(prev => ({
          ...prev,
          error: 'WebAssembly is not supported in this browser'
        }));
        return;
      }
    };

    checkSupport();
  }, []);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Status indicator */}
      <div className="mb-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            cameraState.isActive ? 'bg-green-500' : 
            cameraState.error ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
          <span className="text-sm font-medium">
            {cameraState.isActive ? 'Camera Active' :
             cameraState.error ? 'Camera Error' : 'Initializing Camera...'}
          </span>
        </div>
        
        {cameraState.error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {cameraState.error}
          </p>
        )}
      </div>

      {/* Video container */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        
        {/* Overlay canvas for landmarks */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
        />
        
        {/* Loading overlay */}
        {!cameraState.isActive && !cameraState.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="text-white text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
              <p>Initializing camera...</p>
            </div>
          </div>
        )}
        
        {/* Error overlay */}
        {cameraState.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-50">
            <div className="text-white text-center p-4">
              <p className="font-medium">Camera Error</p>
              <p className="text-sm mt-1">{cameraState.error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Position yourself in front of the camera for optimal detection:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Ensure good lighting on your face</li>
          <li>Stay within the camera frame</li>
          <li>Keep your face clearly visible</li>
        </ul>
      </div>
    </div>
  );
}
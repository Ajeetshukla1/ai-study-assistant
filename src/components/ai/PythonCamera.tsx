'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { FocusState, AIDetectionResult } from '@/types';

interface PythonCameraProps {
  onStateChange: (result: AIDetectionResult) => void;
  isActive: boolean;
}

interface BackendMessage {
  frame?: string;
  detection?: {
    state: FocusState;
    confidence: number;
    head_pose: {
      pitch: number;
      yaw: number;
      roll: number;
    };
    eye_aspect_ratio: number;
    landmarks_detected: boolean;
    timestamp: string;
  };
  error?: string;
  timestamp: string;
}

export function PythonCamera({ onStateChange, isActive }: PythonCameraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [backendStatus, setBackendStatus] = useState<string>('');
  const [frameCount, setFrameCount] = useState(0);

  // Start backend connection
  const startBackend = useCallback(async () => {
    try {
      // First, start the camera on the backend
      const response = await fetch('http://127.0.0.1:8000/camera/start', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setBackendStatus(result.message);
      
      return result.success;
    } catch (error) {
      console.error('Backend start error:', error);
      setBackendStatus(`Backend error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, []);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');
    
    try {
      const ws = new WebSocket('ws://127.0.0.1:8000/ws/camera');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState('connected');
        setBackendStatus('Connected to Python backend');
      };
      
      ws.onmessage = (event) => {
        try {
          const data: BackendMessage = JSON.parse(event.data);
          
          if (data.error) {
            console.error('Backend error:', data.error);
            setBackendStatus(`Backend error: ${data.error}`);
            return;
          }
          
          if (data.frame && canvasRef.current) {
            // Display the frame
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              const img = new Image();
              img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                setFrameCount(prev => prev + 1);
              };
              img.src = `data:image/jpeg;base64,${data.frame}`;
            }
          }
          
          if (data.detection) {
            // Convert backend detection to our format
            const detectionResult: AIDetectionResult = {
              state: data.detection.state,
              confidence: data.detection.confidence,
              headPose: {
                pitch: data.detection.head_pose.pitch,
                yaw: data.detection.head_pose.yaw,
                roll: data.detection.head_pose.roll,
              },
              eyeAspectRatio: data.detection.eye_aspect_ratio,
            };
            
            onStateChange(detectionResult);
          }
          
        } catch (error) {
          console.error('Message parsing error:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionState('disconnected');
        setBackendStatus('Disconnected from backend');
        wsRef.current = null;
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
        setBackendStatus('WebSocket connection error');
      };
      
      wsRef.current = ws;
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnectionState('error');
      setBackendStatus(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [onStateChange]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('disconnected');
    setFrameCount(0);
  }, []);

  // Handle active state changes
  useEffect(() => {
    if (isActive) {
      startBackend().then((success) => {
        if (success) {
          connectWebSocket();
        }
      });
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isActive, startBackend, connectWebSocket, disconnectWebSocket]);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Status indicator */}
      <div className="mb-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionState === 'connected' ? 'bg-green-500' : 
            connectionState === 'connecting' ? 'bg-yellow-500' :
            connectionState === 'error' ? 'bg-red-500' : 'bg-gray-500'
          }`} />
          <span className="text-sm font-medium">
            {connectionState === 'connected' ? 'Python Backend Connected' :
             connectionState === 'connecting' ? 'Connecting to Backend...' :
             connectionState === 'error' ? 'Backend Connection Error' :
             'Backend Disconnected'}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {backendStatus}
        </p>
        
        {connectionState === 'connected' && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            Frames received: {frameCount} | Real MediaPipe AI Detection Active
          </p>
        )}
      </div>

      {/* Camera feed container */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3', minHeight: '300px' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          style={{ display: 'block' }}
        />
        
        {/* Status overlays */}
        {connectionState === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
            <div className="text-white text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
              <p>Connecting to Python backend...</p>
            </div>
          </div>
        )}
        
        {connectionState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-75">
            <div className="text-white text-center p-4">
              <p className="font-medium">Backend Connection Error</p>
              <p className="text-sm mt-1">Make sure Python backend is running:</p>
              <code className="text-xs bg-black bg-opacity-50 p-2 rounded mt-2 block">
                python backend.py
              </code>
            </div>
          </div>
        )}
        
        {connectionState === 'disconnected' && isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
            <div className="text-white text-center p-4">
              <p className="font-medium">Starting Python Backend...</p>
              <p className="text-sm mt-1">Initializing camera and AI detection</p>
            </div>
          </div>
        )}
        
        {connectionState === 'connected' && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            PYTHON AI ACTIVE
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p className="mb-2">
          <strong>Python Backend Integration:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Real camera feed processed by Python OpenCV</li>
          <li>MediaPipe face detection with accurate head pose calculation</li>
          <li>Real-time AI state detection (not simulated)</li>
          <li>WebSocket streaming for low-latency video feed</li>
        </ul>
        
        {connectionState === 'error' && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400 font-medium text-sm">
              Backend Setup Required:
            </p>
            <ol className="text-red-600 dark:text-red-400 text-xs mt-1 list-decimal list-inside">
              <li>Install dependencies: <code>pip install -r requirements.txt</code></li>
              <li>Start backend: <code>python backend.py</code></li>
              <li>Backend should run on http://127.0.0.1:8000</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState, useCallback } from 'react';
import { PythonCamera } from '@/components/ai/PythonCamera';
import { StateDisplay } from '@/components/ai/StateDisplay';
import { AIDetectionResult, FocusState } from '@/types';

export default function PythonAIPage() {
  const [currentDetectionResult, setCurrentDetectionResult] = useState<AIDetectionResult>({
    state: 'unknown',
    confidence: 0,
    headPose: { pitch: 0, yaw: 0, roll: 0 },
    eyeAspectRatio: 0
  });
  
  const [isDetectionActive, setIsDetectionActive] = useState(false);
  const [detectionHistory, setDetectionHistory] = useState<Array<{ 
    state: FocusState; 
    timestamp: number; 
    confidence: number 
  }>>([]);

  const handleStateChange = useCallback((result: AIDetectionResult) => {
    setCurrentDetectionResult(result);
    
    // Add to history for analysis
    setDetectionHistory(prev => [
      ...prev.slice(-100), // Keep last 100 detections
      {
        state: result.state,
        timestamp: Date.now(),
        confidence: result.confidence
      }
    ]);
  }, []);

  const toggleDetection = () => {
    setIsDetectionActive(!isDetectionActive);
    if (!isDetectionActive) {
      // Reset detection result when starting
      setCurrentDetectionResult({
        state: 'unknown',
        confidence: 0,
        headPose: { pitch: 0, yaw: 0, roll: 0 },
        eyeAspectRatio: 0
      });
      setDetectionHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🐍 Python AI Study Assistant
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Real AI-powered focus detection using Python, OpenCV, and MediaPipe. 
            Accurate face detection with actual head pose calculation and eye tracking.
          </p>
        </div>

        {/* Features highlight */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl mb-2">🎥</div>
              <h3 className="font-semibold">Real Camera</h3>
              <p className="text-sm opacity-90">OpenCV capture</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🧠</div>
              <h3 className="font-semibold">MediaPipe AI</h3>
              <p className="text-sm opacity-90">Face mesh detection</p>
            </div>
            <div>
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-semibold">Real-time</h3>
              <p className="text-sm opacity-90">WebSocket streaming</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-semibold">Accurate</h3>
              <p className="text-sm opacity-90">Precise measurements</p>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Python AI Detection
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Backend: FastAPI + OpenCV + MediaPipe
              </p>
            </div>
            <button
              onClick={toggleDetection}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                isDetectionActive
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
                  : 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg'
              }`}
            >
              {isDetectionActive ? 'Stop AI Detection' : 'Start AI Detection'}
            </button>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">
              <strong>Real AI Features:</strong> This version uses actual computer vision algorithms, not simulation.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Face Mesh:</strong> 468 facial landmark points for precise tracking</li>
              <li><strong>Head Pose:</strong> 6DOF head position and orientation</li>
              <li><strong>Eye Tracking:</strong> Precise Eye Aspect Ratio (EAR) calculation</li>
              <li><strong>Real-time:</strong> 30 FPS processing with low latency</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Python Camera Feed */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">🐍</span>
              Python Camera Feed
            </h3>
            <PythonCamera
              onStateChange={handleStateChange}
              isActive={isDetectionActive}
            />
          </div>

          {/* AI Results */}
          <div className="space-y-6">
            {/* Current State */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="mr-2">🎯</span>
                AI Detection Results
              </h3>
              <StateDisplay
                currentState={currentDetectionResult.state}
                confidence={currentDetectionResult.confidence}
              />
            </div>

            {/* Technical Measurements */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="mr-2">📊</span>
                Technical Measurements
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Head Pitch:</span>
                    <span className="font-mono font-semibold">{currentDetectionResult.headPose.pitch.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Head Yaw:</span>
                    <span className="font-mono font-semibold">{currentDetectionResult.headPose.yaw.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Head Roll:</span>
                    <span className="font-mono font-semibold">{currentDetectionResult.headPose.roll.toFixed(1)}°</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Eye Aspect Ratio:</span>
                    <span className="font-mono font-semibold">{currentDetectionResult.eyeAspectRatio.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                    <span className="font-mono font-semibold">{(currentDetectionResult.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Detection Rate:</span>
                    <span className="font-mono font-semibold">~30 FPS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Statistics */}
        {detectionHistory.length > 10 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">📈</span>
              Live Analytics (Last {detectionHistory.length} detections)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['focused', 'relaxing', 'distracted', 'drowsy'].map(state => {
                const count = detectionHistory.filter(h => h.state === state).length;
                const percentage = detectionHistory.length > 0 
                  ? ((count / detectionHistory.length) * 100).toFixed(1)
                  : '0';
                
                const color = {
                  focused: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                  relaxing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                  distracted: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
                  drowsy: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }[state];
                
                return (
                  <div key={state} className={`text-center p-4 rounded-lg ${color}`}>
                    <div className="text-2xl font-bold">{percentage}%</div>
                    <div className="text-sm font-medium capitalize">{state}</div>
                    <div className="text-xs opacity-75">({count} detections)</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Backend Setup Instructions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🚀 Backend Setup Instructions
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm font-medium mb-3">To run the Python backend:</p>
            <div className="space-y-2 font-mono text-sm">
              <div className="bg-black text-green-400 p-2 rounded">
                <span className="text-gray-500">$</span> pip install -r requirements.txt
              </div>
              <div className="bg-black text-green-400 p-2 rounded">
                <span className="text-gray-500">$</span> python backend.py
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
              Backend will run on http://127.0.0.1:8000 with WebSocket support for real-time streaming.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
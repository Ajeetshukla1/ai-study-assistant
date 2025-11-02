'use client';

import { useState, useCallback } from 'react';
import { PythonCamera } from '@/components/ai/PythonCamera';
import { StateDisplay } from '@/components/ai/StateDisplay';
import { AIDetectionResult, FocusState } from '@/types';

export default function Home() {
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
    
    // Add to history for debugging/analysis
    setDetectionHistory(prev => [
      ...prev.slice(-50), // Keep last 50 detections
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🐍 AI Smart Study Assistant (Python Backend)
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Real AI-powered focus detection using Python OpenCV backend. 
            The system uses actual computer vision to monitor your attention state in real-time.
          </p>
        </div>

        {/* Backend Status Alert */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🐍</div>
            <div>
              <h3 className="font-semibold">Python Backend Required</h3>
              <p className="text-sm opacity-90">
                Make sure the Python backend is running: <code className="bg-black bg-opacity-20 px-2 py-1 rounded">python backend.py</code>
              </p>
            </div>
          </div>
        </div>

        {/* Navigation to New Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-linear-to-r from-green-500 to-blue-500 text-white rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">
                  🚀 Study Lock Mode
                </h2>
                <p className="text-sm opacity-90">
                  Privacy-first study sessions with configurable AI
                </p>
              </div>
              <a 
                href="/study-mode"
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm"
              >
                Launch →
              </a>
            </div>
          </div>
          
          <div className="bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">
                  🔧 Detection Calibration
                </h2>
                <p className="text-sm opacity-90">
                  Test and optimize AI accuracy for your setup
                </p>
              </div>
              <a 
                href="/calibration"
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm"
              >
                Calibrate →
              </a>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Python AI Detection (Demo Mode)
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Backend: FastAPI + OpenCV + Real Face Detection
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
              <strong>Real AI Backend:</strong> This uses actual computer vision algorithms, not simulation.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Face Detection:</strong> OpenCV Haar Cascades for face tracking</li>
              <li><strong>Eye Detection:</strong> Real eye aspect ratio calculation</li>
              <li><strong>Head Pose:</strong> Position-based pose estimation</li>
              <li><strong>WebSocket:</strong> Real-time streaming at 15 FPS</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Camera Feed */}
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

          {/* State Display */}
          <div className="space-y-6">
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

            {/* Technical Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Technical Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Head Pitch:</span>
                  <span className="font-mono">{currentDetectionResult.headPose.pitch.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Head Yaw:</span>
                  <span className="font-mono">{currentDetectionResult.headPose.yaw.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Head Roll:</span>
                  <span className="font-mono">{currentDetectionResult.headPose.roll.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Eye Aspect Ratio:</span>
                  <span className="font-mono">{currentDetectionResult.eyeAspectRatio.toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detection History */}
        {detectionHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Detections
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['focused', 'relaxing', 'distracted', 'drowsy'].map(state => {
                const count = detectionHistory.filter(h => h.state === state).length;
                const percentage = detectionHistory.length > 0 
                  ? ((count / detectionHistory.length) * 100).toFixed(1)
                  : '0';
                
                return (
                  <div key={state} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="text-lg font-semibold capitalize text-gray-900 dark:text-white">
                      {state}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {percentage}% ({count})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🚀 Coming Next
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Phase 2: Study Sessions
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Timer functionality, configurable sessions, and break scheduling
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Phase 3: Data Logging
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Backend API and database integration for session tracking
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <h4 className="font-semibant text-purple-900 dark:text-purple-100 mb-2">
                Phase 4: Analytics
              </h4>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Dashboard with insights and productivity analytics
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

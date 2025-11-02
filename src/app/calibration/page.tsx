'use client';

import { useState } from 'react';
import { DetectionCalibration } from '@/components/ai/DetectionCalibration';

export default function CalibrationPage() {
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const [calibrationResults, setCalibrationResults] = useState<{
    isWellCalibrated: boolean;
    accuracy?: number;
  }>({ isWellCalibrated: false });

  const handleCalibrationComplete = (isWellCalibrated: boolean) => {
    setCalibrationResults({ isWellCalibrated });
    setCalibrationComplete(true);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🔧 AI Detection Calibration
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Test and optimize AI detection accuracy for your specific setup, lighting, and camera position.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center space-x-4 mb-8">
          <a 
            href="/"
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            ← Demo Mode
          </a>
          <a 
            href="/study-mode"
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
          >
            Study Mode →
          </a>
        </div>

        {/* Backend Status Check */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                🐍 Backend Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ensure Python backend is running for calibration
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Terminal:</div>
              <code className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-sm">
                python backend.py
              </code>
            </div>
          </div>
        </div>

        {/* Calibration Results */}
        {calibrationComplete && (
          <div className={`mb-8 p-6 rounded-lg ${
            calibrationResults.isWellCalibrated
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {calibrationResults.isWellCalibrated ? '✅' : '⚠️'}
              </div>
              <div>
                <h3 className={`font-semibold ${
                  calibrationResults.isWellCalibrated 
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {calibrationResults.isWellCalibrated 
                    ? 'Calibration Successful!' 
                    : 'Calibration Needs Improvement'}
                </h3>
                <p className={`text-sm ${
                  calibrationResults.isWellCalibrated
                    ? 'text-green-600 dark:text-green-300'
                    : 'text-red-600 dark:text-red-300'
                }`}>
                  {calibrationResults.isWellCalibrated
                    ? 'Your AI detection is working well. You can proceed to Study Mode.'
                    : 'Try adjusting your lighting, camera position, or switching to MediaPipe detector.'}
                </p>
              </div>
            </div>
            
            {calibrationResults.isWellCalibrated && (
              <div className="mt-4">
                <a 
                  href="/study-mode"
                  className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                  🚀 Start Study Session
                </a>
              </div>
            )}
          </div>
        )}

        {/* Main Calibration Interface */}
        <DetectionCalibration onCalibrationComplete={handleCalibrationComplete} />

        {/* Help Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🆘 Troubleshooting Detection Issues
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Common Issues:
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• <strong>Not detecting head turns:</strong> Switch to MediaPipe detector</li>
                <li>• <strong>False drowsy alerts:</strong> Improve lighting on your face</li>
                <li>• <strong>Poor accuracy:</strong> Position camera at eye level</li>
                <li>• <strong>No face detection:</strong> Remove glasses, reduce glare</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Optimal Setup:
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• <strong>Lighting:</strong> Soft, even light on face</li>
                <li>• <strong>Camera:</strong> Eye level, 2-3 feet away</li>
                <li>• <strong>Background:</strong> Plain, not too bright</li>
                <li>• <strong>Detector:</strong> Use MediaPipe for best accuracy</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              💡 Pro Tip
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              The MediaPipe detector is much more accurate than OpenCV but uses more CPU. 
              If your computer is slow, you can use the OpenCV detector, but expect lower accuracy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { PythonCamera } from './PythonCamera';
import { AIDetectionResult } from '@/types';

interface DetectionCalibrationProps {
  onCalibrationComplete: (isCalibrated: boolean) => void;
}

export function DetectionCalibration({ onCalibrationComplete }: DetectionCalibrationProps) {
  const [currentDetection, setCurrentDetection] = useState<AIDetectionResult>({
    state: 'unknown',
    confidence: 0,
    headPose: { pitch: 0, yaw: 0, roll: 0 },
    eyeAspectRatio: 0
  });
  
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [detectorInfo, setDetectorInfo] = useState<any>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationData, setCalibrationData] = useState<any[]>([]);

  // Calibration steps
  const calibrationSteps = [
    {
      title: "Look Straight Ahead",
      description: "Look directly at the camera with a neutral expression",
      duration: 3,
      expectedState: "focused"
    },
    {
      title: "Look Down (Phone Check)",
      description: "Look down as if checking your phone",
      duration: 3,
      expectedState: "distracted"
    },
    {
      title: "Look Left",
      description: "Turn your head to look to the left",
      duration: 3,
      expectedState: "relaxing"
    },
    {
      title: "Look Right", 
      description: "Turn your head to look to the right",
      duration: 3,
      expectedState: "relaxing"
    },
    {
      title: "Close Your Eyes",
      description: "Close your eyes and keep them closed",
      duration: 3,
      expectedState: "drowsy"
    }
  ];

  // Get detector info on mount
  useEffect(() => {
    fetchDetectorInfo();
  }, []);

  const fetchDetectorInfo = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/detector/info');
      const info = await response.json();
      setDetectorInfo(info);
    } catch (error) {
      console.error('Error fetching detector info:', error);
    }
  };

  const switchDetector = async (usePrecise: boolean) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/detector/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_precise: usePrecise })
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchDetectorInfo();
      }
    } catch (error) {
      console.error('Error switching detector:', error);
    }
  };

  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationStep(0);
    setCalibrationData([]);
  };

  const nextCalibrationStep = () => {
    // Save current detection data
    const stepData = {
      step: calibrationStep,
      expected: calibrationSteps[calibrationStep].expectedState,
      actual: currentDetection.state,
      headPose: currentDetection.headPose,
      eyeAspectRatio: currentDetection.eyeAspectRatio,
      confidence: currentDetection.confidence
    };
    
    setCalibrationData(prev => [...prev, stepData]);
    
    if (calibrationStep < calibrationSteps.length - 1) {
      setCalibrationStep(calibrationStep + 1);
    } else {
      completeCalibration();
    }
  };

  const completeCalibration = () => {
    setIsCalibrating(false);
    
    // Analyze calibration results
    const accuracy = calibrationData.filter(
      data => data.actual === data.expected
    ).length / calibrationData.length;
    
    const isWellCalibrated = accuracy > 0.6; // 60% accuracy threshold
    onCalibrationComplete(isWellCalibrated);
  };

  const getAngleColor = (angle: number, threshold: number) => {
    const abs_angle = Math.abs(angle);
    if (abs_angle > threshold) return 'text-red-500';
    if (abs_angle > threshold * 0.7) return 'text-yellow-500';
    return 'text-green-500';
  };

  const currentStep = calibrationSteps[calibrationStep];

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🎯 Detection Calibration & Testing
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Test and calibrate AI detection for optimal accuracy
        </p>
      </div>

      {/* Detector Selection */}
      {detectorInfo && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            AI Detector: {detectorInfo.current_detector}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
              detectorInfo.current_detector === 'MediaPipe Precise' 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                : 'border-gray-300 hover:border-gray-400'
            }`} onClick={() => switchDetector(true)}>
              <h4 className="font-semibold text-green-700 dark:text-green-300">MediaPipe Precise (Recommended)</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                High accuracy • 468 facial landmarks • Precise head pose
              </p>
            </div>
            
            <div className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
              detectorInfo.current_detector === 'OpenCV Basic'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 hover:border-gray-400'  
            }`} onClick={() => switchDetector(false)}>
              <h4 className="font-semibold text-blue-700 dark:text-blue-300">OpenCV Basic (Lightweight)</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Fast performance • Lower accuracy • Basic detection
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Feed */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Live Detection Feed
          </h3>
          <PythonCamera
            onStateChange={setCurrentDetection}
            isActive={true}
          />
        </div>

        {/* Detection Analysis */}
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Real-Time Analysis
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Current State:</span>
                <span className={`font-semibold ${
                  currentDetection.state === 'focused' ? 'text-green-500' :
                  currentDetection.state === 'relaxing' ? 'text-blue-500' :
                  currentDetection.state === 'distracted' ? 'text-orange-500' :
                  currentDetection.state === 'drowsy' ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {currentDetection.state.toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Confidence:</span>
                <span className="font-mono">{(currentDetection.confidence * 100).toFixed(1)}%</span>
              </div>
              
              <div className="flex justify-between">
                <span>Head Pitch (Up/Down):</span>
                <span className={`font-mono ${getAngleColor(currentDetection.headPose.pitch, 20)}`}>
                  {currentDetection.headPose.pitch.toFixed(1)}°
                  {currentDetection.headPose.pitch > 20 ? ' (DOWN)' : 
                   currentDetection.headPose.pitch < -15 ? ' (UP)' : ' (LEVEL)'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Head Yaw (Left/Right):</span>
                <span className={`font-mono ${getAngleColor(currentDetection.headPose.yaw, 25)}`}>
                  {currentDetection.headPose.yaw.toFixed(1)}°
                  {currentDetection.headPose.yaw > 25 ? ' (RIGHT)' : 
                   currentDetection.headPose.yaw < -25 ? ' (LEFT)' : ' (CENTER)'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Eye Aspect Ratio:</span>
                <span className={`font-mono ${
                  currentDetection.eyeAspectRatio < 0.25 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {currentDetection.eyeAspectRatio.toFixed(3)}
                  {currentDetection.eyeAspectRatio < 0.25 ? ' (CLOSED)' : ' (OPEN)'}
                </span>
              </div>
            </div>
          </div>

          {/* Calibration Section */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Calibration Test
            </h3>
            
            {!isCalibrating ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Run a calibration test to verify detection accuracy with your setup and lighting conditions.
                </p>
                <button
                  onClick={startCalibration}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Start Calibration Test
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      Step {calibrationStep + 1} of {calibrationSteps.length}
                    </span>
                    <span className="text-xs text-gray-500">
                      {currentStep.duration}s each
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((calibrationStep + 1) / calibrationSteps.length) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentStep.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentStep.description}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="mb-2">
                    <span className="text-sm text-gray-500">Expected: </span>
                    <span className="font-medium">{currentStep.expectedState}</span>
                  </div>
                  <div className="mb-4">
                    <span className="text-sm text-gray-500">Detecting: </span>
                    <span className={`font-medium ${
                      currentDetection.state === currentStep.expectedState ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {currentDetection.state}
                    </span>
                  </div>
                  
                  <button
                    onClick={nextCalibrationStep}
                    className="bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-lg font-medium transition-colors"
                  >
                    {calibrationStep < calibrationSteps.length - 1 ? 'Next Step' : 'Complete Test'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              💡 Detection Tips
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Ensure good lighting on your face</li>
              <li>• Position camera at eye level</li>
              <li>• Avoid strong backlighting</li>
              <li>• Keep face centered in camera view</li>
              <li>• MediaPipe detector is more accurate but uses more CPU</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
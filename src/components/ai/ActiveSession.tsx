'use client';

import { useState, useEffect } from 'react';
import { SessionStatus } from '@/types/session';
import { PythonCamera } from './PythonCamera';
import { StateDisplay } from './StateDisplay';
import { AIDetectionResult } from '@/types';

interface ActiveSessionProps {
  onEndSession: () => void;
}

export function ActiveSession({ onEndSession }: ActiveSessionProps) {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({ active: false });
  const [currentDetection, setCurrentDetection] = useState<AIDetectionResult>({
    state: 'unknown',
    confidence: 0,
    headPose: { pitch: 0, yaw: 0, roll: 0 },
    eyeAspectRatio: 0
  });
  const [showBreakModal, setShowBreakModal] = useState(false);

  // Poll session status
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/session/status');
        const status = await response.json();
        setSessionStatus(status);

        // Check if session is complete
        if (status.session_complete) {
          onEndSession();
        }

        // Check if it's break time (you could implement break detection logic here)
        // For now, this is a placeholder for break notifications
      } catch (error) {
        console.error('Error fetching session status:', error);
      }
    };

    const interval = setInterval(pollStatus, 1000); // Poll every second
    pollStatus(); // Initial poll

    return () => clearInterval(interval);
  }, [onEndSession]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePauseResume = async () => {
    try {
      const endpoint = sessionStatus.paused ? 'resume' : 'pause';
      await fetch(`http://127.0.0.1:8000/session/${endpoint}`, { method: 'POST' });
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  const handleEndSession = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/session/stop', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        onEndSession();
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const getStateEmoji = (state: string) => {
    switch (state) {
      case 'focused': return '🎯';
      case 'relaxing': return '🧘‍♂️';
      case 'distracted': return '📱';
      case 'drowsy': return '😴';
      default: return '❓';
    }
  };

  if (!sessionStatus.active) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6">
        {/* Session Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                📚 Study Lock Mode Active
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                AI monitoring your focus in real-time
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono text-purple-600 dark:text-purple-400">
                {sessionStatus.remaining_minutes ? formatTime(sessionStatus.remaining_minutes) : '--:--'}
              </div>
              <div className="text-sm text-gray-500">Time remaining</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Session Progress</span>
              <span>{sessionStatus.progress_percentage?.toFixed(1) || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-linear-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${sessionStatus.progress_percentage || 0}%` }}
              />
            </div>
          </div>

          {/* Session Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePauseResume}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  sessionStatus.paused
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
              >
                {sessionStatus.paused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
              
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                sessionStatus.paused 
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              }`}>
                {sessionStatus.paused ? 'PAUSED' : 'ACTIVE'}
              </div>
            </div>

            <button
              onClick={handleEndSession}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              🛑 End Session
            </button>
          </div>
        </div>

        {/* Main Content - Camera and State */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  🎥 AI Monitor
                </h3>
                <div className="flex items-center space-x-2">
                  <span className={`text-2xl ${getStateEmoji(currentDetection.state)}`}>
                    {getStateEmoji(currentDetection.state)}
                  </span>
                  <span className="text-sm font-medium capitalize">
                    {currentDetection.state}
                  </span>
                </div>
              </div>
              
              <PythonCamera
                onStateChange={setCurrentDetection}
                isActive={!sessionStatus.paused}
              />
            </div>
          </div>

          {/* State Display and Info */}
          <div className="space-y-6">
            {/* Current State */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Focus Status
              </h3>
              <StateDisplay
                currentState={currentDetection.state}
                confidence={currentDetection.confidence}
              />
            </div>

            {/* Session Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Session Info
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Elapsed Time:</span>
                  <span className="font-mono">{sessionStatus.elapsed_minutes ? formatTime(sessionStatus.elapsed_minutes) : '--:--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                  <span className="font-mono">{sessionStatus.remaining_minutes ? formatTime(sessionStatus.remaining_minutes) : '--:--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Progress:</span>
                  <span className="font-medium">{sessionStatus.progress_percentage?.toFixed(1) || 0}%</span>
                </div>
              </div>
              
              {sessionStatus.next_break && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Next Break:</strong> {new Date(sessionStatus.next_break).toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>

            {/* AI Technical Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                AI Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Head Pitch:</span>
                  <span className="font-mono">{currentDetection.headPose.pitch.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Head Yaw:</span>
                  <span className="font-mono">{currentDetection.headPose.yaw.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Eye Aspect Ratio:</span>
                  <span className="font-mono">{currentDetection.eyeAspectRatio.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                  <span className="font-mono">{(currentDetection.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { SessionSetup } from '@/components/ai/SessionSetup';
import { ActiveSession } from '@/components/ai/ActiveSession';
import { SessionConfig } from '@/types/session';

export default function StudyModePage() {
  const [sessionActive, setSessionActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartSession = async (config: SessionConfig) => {
    setIsStarting(true);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      
      if (result.success) {
        setSessionActive(true);
      } else {
        alert(`Failed to start session: ${result.error}`);
      }
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to connect to backend. Make sure Python backend is running.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndSession = () => {
    setSessionActive(false);
  };

  if (sessionActive) {
    return <ActiveSession onEndSession={handleEndSession} />;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            📚 AI Study Assistant
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Privacy-first AI study sessions with real-time focus monitoring. 
            All processing happens on your device - no data leaves your computer.
          </p>
        </div>

        {/* Privacy Banner */}
        <div className="bg-linear-to-r from-green-500 to-blue-500 text-white rounded-lg p-4 mb-8">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🔒</div>
            <div>
              <h3 className="font-semibold">100% Privacy Protected</h3>
              <p className="text-sm opacity-90">
                All AI processing happens locally on your device. Zero data collection. Zero external servers.
              </p>
            </div>
          </div>
        </div>

        {/* Backend Status Check */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                🐍 Python Backend Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Make sure the backend is running for AI detection to work
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Run in terminal:</div>
              <code className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-sm">
                python backend.py
              </code>
            </div>
          </div>
        </div>

        {/* Session Setup */}
        <SessionSetup 
          onStartSession={handleStartSession}
          isLoading={isStarting}
        />

        {/* Features Overview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-2xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Real-Time Focus Detection
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Advanced AI monitors your attention state using computer vision and machine learning
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-2xl mb-3">⏰</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Smart Break Scheduling
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Customizable break intervals to maintain peak cognitive performance
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-2xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Session Analytics
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track your focus patterns and optimize your study habits over time
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-2xl mb-3">🔧</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Customizable AI Sensitivity
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Adjust detection thresholds for drowsiness, distraction, and relaxation
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-2xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Privacy First
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All processing happens locally. No cloud servers, no data collection
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-2xl mb-3">🚀</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Lock Mode
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Dedicated focus interface that minimizes distractions during study
            </p>
          </div>
        </div>

        {/* Tech Stack Info */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🛠️ Technology Stack
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Frontend</div>
              <div className="text-gray-600 dark:text-gray-400">Next.js + React</div>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Backend</div>
              <div className="text-gray-600 dark:text-gray-400">Python + FastAPI</div>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">AI Engine</div>
              <div className="text-gray-600 dark:text-gray-400">OpenCV + TensorFlow</div>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Communication</div>
              <div className="text-gray-600 dark:text-gray-400">WebSocket Streaming</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
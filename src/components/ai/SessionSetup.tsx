'use client';

import { useState } from 'react';
import { SessionConfig } from '@/types/session';

interface SessionSetupProps {
  onStartSession: (config: SessionConfig) => void;
  isLoading?: boolean;
}

export function SessionSetup({ onStartSession, isLoading = false }: SessionSetupProps) {
  const [duration, setDuration] = useState(120); // 2 hours default
  const [drowsyThreshold, setDrowsyThreshold] = useState(25);
  const [relaxingThreshold, setRelaxingThreshold] = useState(30);
  const [distractionThreshold, setDistractionThreshold] = useState(15);
  const [breakCount, setBreakCount] = useState(2);
  const [breakDuration, setBreakDuration] = useState(3);
  const [breakInterval, setBreakInterval] = useState(45);

  const presets = {
    'Focused Study': {
      duration: 90,
      drowsy: 20,
      relaxing: 25,
      distraction: 10,
      breaks: 1,
      breakDuration: 5,
      interval: 45
    },
    'Deep Work': {
      duration: 120,
      drowsy: 30,
      relaxing: 35,
      distraction: 15,
      breaks: 2,
      breakDuration: 3,
      interval: 40
    },
    'Light Study': {
      duration: 60,
      drowsy: 15,
      relaxing: 20,
      distraction: 8,
      breaks: 2,
      breakDuration: 2,
      interval: 20
    }
  };

  const loadPreset = (presetName: keyof typeof presets) => {
    const preset = presets[presetName];
    setDuration(preset.duration);
    setDrowsyThreshold(preset.drowsy);
    setRelaxingThreshold(preset.relaxing);
    setDistractionThreshold(preset.distraction);
    setBreakCount(preset.breaks);
    setBreakDuration(preset.breakDuration);
    setBreakInterval(preset.interval);
  };

  const handleStartSession = () => {
    const config: SessionConfig = {
      duration_minutes: duration,
      ai_thresholds: {
        drowsy_ear_threshold: 0.20,
        drowsy_time_threshold: drowsyThreshold,
        drowsy_grace_period: 5.0,
        distracted_pitch_threshold: 30.0,
        distracted_time_threshold: distractionThreshold,
        distracted_grace_period: distractionThreshold,
        relaxing_yaw_threshold: 25.0,
        relaxing_time_threshold: relaxingThreshold,
        relaxing_grace_period: relaxingThreshold,
      },
      break_schedule: {
        break_count: breakCount,
        break_duration: breakDuration,
        break_interval: breakInterval,
      }
    };

    onStartSession(config);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🎯 Study Lock Mode Setup
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your study session with AI-powered focus monitoring
        </p>
      </div>

      {/* Quick Presets */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Quick Presets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.keys(presets).map((presetName) => (
            <button
              key={presetName}
              onClick={() => loadPreset(presetName as keyof typeof presets)}
              className="p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="font-medium text-sm">{presetName}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {formatTime(presets[presetName as keyof typeof presets].duration)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Session Duration */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Session Duration: {formatTime(duration)}
        </label>
        <input
          type="range"
          min="30"
          max="240"
          step="15"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>30m</span>
          <span>4h</span>
        </div>
      </div>

      {/* AI Sensitivity Settings */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          AI Detection Sensitivity
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Eyes Closed Alert: {drowsyThreshold}s
              <span className="text-xs text-gray-500 ml-2">(Drowsiness detection)</span>
            </label>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={drowsyThreshold}
              onChange={(e) => setDrowsyThreshold(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10s (Sensitive)</span>
              <span>60s (Relaxed)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Look Away Grace Period: {relaxingThreshold}s
              <span className="text-xs text-gray-500 ml-2">(Eye relaxation)</span>
            </label>
            <input
              type="range"
              min="15"
              max="60"
              step="5"
              value={relaxingThreshold}
              onChange={(e) => setRelaxingThreshold(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Check Alert: {distractionThreshold}s
              <span className="text-xs text-gray-500 ml-2">(Looking down)</span>
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={distractionThreshold}
              onChange={(e) => setDistractionThreshold(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Break Schedule */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Break Schedule
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of Breaks: {breakCount}
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={breakCount}
              onChange={(e) => setBreakCount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Break Duration: {breakDuration}min
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={breakDuration}
              onChange={(e) => setBreakDuration(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Break Interval: {breakInterval}min
            </label>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={breakInterval}
              onChange={(e) => setBreakInterval(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        </div>

        {breakCount > 0 && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              📅 You'll get {breakCount} break{breakCount > 1 ? 's' : ''} of {breakDuration} minute{breakDuration > 1 ? 's' : ''} each, 
              every {breakInterval} minutes during your {formatTime(duration)} session.
            </p>
          </div>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={handleStartSession}
        disabled={isLoading}
        className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
        } text-white`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
            Starting Session...
          </div>
        ) : (
          `🚀 Start ${formatTime(duration)} Study Session`
        )}
      </button>

      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="text-center">
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
            💡 <strong>First time?</strong> Run calibration to optimize detection accuracy
          </p>
          <a 
            href="/calibration"
            className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline"
          >
            Test & Calibrate AI Detection →
          </a>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        Privacy-first: All AI processing happens on your device. No data is sent to external servers.
      </div>
    </div>
  );
}
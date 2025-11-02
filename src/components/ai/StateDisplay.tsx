'use client';

import { FocusState } from '@/types';
import { cn } from '@/lib/utils';

interface StateDisplayProps {
  currentState: FocusState;
  confidence: number;
  className?: string;
}

const stateConfig = {
  focused: {
    label: 'Focused',
    icon: '✅',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    description: 'Great! You are focused on your work.'
  },
  relaxing: {
    label: 'Relaxing',
    icon: '🧘‍♂️',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Taking a quick eye break - this is healthy!'
  },
  distracted: {
    label: 'Distracted',
    icon: '📱',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    description: 'You seem distracted. Try to refocus on your work.'
  },
  drowsy: {
    label: 'Drowsy',
    icon: '😴',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    description: 'You look tired. Consider taking a break or getting some rest.'
  },
  unknown: {
    label: 'Unknown',
    icon: '❓',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
    description: 'Unable to detect your current state. Please ensure you are visible to the camera.'
  }
};

export function StateDisplay({ currentState, confidence, className }: StateDisplayProps) {
  const config = stateConfig[currentState];
  const confidencePercentage = Math.round(confidence * 100);

  return (
    <div className={cn(
      "p-6 rounded-lg border transition-all duration-300",
      config.bgColor,
      config.borderColor,
      className
    )}>
      {/* Main state display */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="text-4xl">{config.icon}</div>
        <div>
          <h3 className={cn("text-xl font-semibold", config.color)}>
            {config.label}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Confidence: {confidencePercentage}%
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">Detection Confidence</span>
          <span className="text-xs text-gray-500">{confidencePercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              confidence >= 0.8 ? "bg-green-500" :
              confidence >= 0.6 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${confidencePercentage}%` }}
          />
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 dark:text-gray-300">
        {config.description}
      </p>

      {/* Alert for critical states */}
      {(currentState === 'drowsy' || currentState === 'distracted') && (
        <div className={cn(
          "mt-3 p-2 rounded text-xs font-medium",
          currentState === 'drowsy' 
            ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
            : "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200"
        )}>
          {currentState === 'drowsy' 
            ? "⚠️ Alert: You appear drowsy. Consider taking a break!"
            : "⚠️ Alert: Distraction detected. Try to refocus on your work."
          }
        </div>
      )}
    </div>
  );
}
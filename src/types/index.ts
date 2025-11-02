// Core types for the AI Study Assistant application

export interface StudySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  totalDuration: number; // in minutes
  plannedBreaks: number;
  breakDuration: number; // in minutes
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

export interface StudyLog {
  id: string;
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  state: FocusState;
  durationSeconds: number;
  timestamp: Date;
}

export interface SessionConfig {
  duration: number; // total session time in minutes
  breakCount: number; // number of breaks
  breakDuration: number; // break duration in minutes
}

export interface SessionAnalytics {
  sessionId: string;
  totalTime: number; // in seconds
  focusedTime: number;
  distractedTime: number;
  relaxingTime: number;
  drowsyTime: number;
  focusScore: number; // percentage
  breaksTaken: number;
}

export interface DashboardData {
  userId: string;
  totalSessions: number;
  averageFocusScore: number;
  totalStudyTime: number; // in hours
  bestFocusTimeOfDay: string;
  weeklyFocusScores: number[];
  stateDistribution: {
    focused: number;
    distracted: number;
    relaxing: number;
    drowsy: number;
  };
}

export type FocusState = 'focused' | 'distracted' | 'relaxing' | 'drowsy' | 'unknown';

export interface AIDetectionResult {
  state: FocusState;
  confidence: number;
  headPose: {
    pitch: number; // up/down rotation
    yaw: number;   // left/right rotation
    roll: number;  // tilt rotation
  };
  eyeAspectRatio: number;
  landmarks?: any; // MediaPipe face landmarks
}

export interface CameraState {
  isActive: boolean;
  hasPermission: boolean;
  error: string | null;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number; // seconds remaining
  totalTime: number;   // total session time in seconds
  isBreakTime: boolean;
  currentBreak: number;
}

export interface AlertConfig {
  drowsinessThreshold: number; // seconds before alert
  distractionThreshold: number; // seconds before alert
  enableSoundAlerts: boolean;
  enableVisualAlerts: boolean;
}

// User preferences
export interface UserPreferences {
  userId: string;
  defaultSessionDuration: number;
  defaultBreakCount: number;
  defaultBreakDuration: number;
  alertConfig: AlertConfig;
  theme: 'light' | 'dark' | 'system';
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StudyLogRequest {
  userId: string;
  sessionId: string;
  state: FocusState;
  duration: number;
  timestamp: Date;
}

export interface AnalyticsRequest {
  userId: string;
  startDate?: Date;
  endDate?: Date;
}
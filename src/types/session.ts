// Session-related types for the AI Study Assistant

export interface SessionConfig {
  duration_minutes: number;
  ai_thresholds: {
    drowsy_ear_threshold: number;
    drowsy_time_threshold: number;
    drowsy_grace_period: number;
    distracted_pitch_threshold: number;
    distracted_time_threshold: number;
    distracted_grace_period: number;
    relaxing_yaw_threshold: number;
    relaxing_time_threshold: number;
    relaxing_grace_period: number;
  };
  break_schedule: {
    break_count: number;
    break_duration: number;
    break_interval: number;
  };
}

export interface SessionStatus {
  active: boolean;
  paused?: boolean;
  elapsed_minutes?: number;
  remaining_minutes?: number;
  progress_percentage?: number;
  next_break?: string;
  current_break?: boolean;
  session_complete?: boolean;
}

export interface SessionInfo {
  session_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  break_times: string[];
  config: SessionConfig;
}
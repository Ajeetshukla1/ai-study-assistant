import { FocusState, AIDetectionResult } from '@/types';
import { calculateEAR, calculateHeadPose } from '@/lib/utils';

export class AIStateDetector {
  private currentState: FocusState = 'unknown';
  private stateStartTime: number = 0;
  private stateTimers: Map<FocusState, number> = new Map();
  
  // Thresholds for state detection
  private readonly DROWSY_EAR_THRESHOLD = 0.25;
  private readonly DROWSY_TIME_THRESHOLD = 25000; // 25 seconds
  private readonly DISTRACTION_PITCH_THRESHOLD = 20; // degrees
  private readonly DISTRACTION_TIME_THRESHOLD = 15000; // 15 seconds
  private readonly RELAXING_YAW_THRESHOLD = 30; // degrees
  private readonly RELAXING_TIME_THRESHOLD = 30000; // 30 seconds
  
  constructor() {
    this.resetTimers();
  }

  /**
   * Analyze face landmarks and determine focus state
   * @param landmarks - Face landmarks from MediaPipe
   * @returns AI detection result with state and confidence
   */
  public analyzeFaceLandmarks(landmarks: any[]): AIDetectionResult {
    if (!landmarks || landmarks.length === 0) {
      return {
        state: 'unknown',
        confidence: 0,
        headPose: { pitch: 0, yaw: 0, roll: 0 },
        eyeAspectRatio: 0
      };
    }

    // Calculate head pose
    const headPose = calculateHeadPose(landmarks);
    
    // Calculate eye aspect ratio (simplified - you'd need proper eye landmark indices)
    const leftEyeIndices = [33, 7, 163, 144, 145, 153]; // Approximate left eye landmarks
    const rightEyeIndices = [362, 382, 381, 380, 374, 373]; // Approximate right eye landmarks
    
    const leftEyeLandmarks = leftEyeIndices.map(i => landmarks[i]).filter(Boolean);
    const rightEyeLandmarks = rightEyeIndices.map(i => landmarks[i]).filter(Boolean);
    
    const leftEAR = calculateEAR(leftEyeLandmarks);
    const rightEAR = calculateEAR(rightEyeLandmarks);
    const avgEAR = (leftEAR + rightEAR) / 2;

    // Determine immediate state based on measurements
    const immediateState = this.determineImmediateState(headPose, avgEAR);
    
    // Apply time-based logic for state transitions
    const finalState = this.applyTimeBasedLogic(immediateState);
    
    // Calculate confidence based on how clear the measurements are
    const confidence = this.calculateConfidence(headPose, avgEAR, immediateState);

    return {
      state: finalState,
      confidence,
      headPose,
      eyeAspectRatio: avgEAR,
      landmarks
    };
  }

  /**
   * Determine immediate state based on current measurements
   */
  private determineImmediateState(headPose: any, eyeAspectRatio: number): FocusState {
    // Check for drowsiness first (eyes closed)
    if (eyeAspectRatio < this.DROWSY_EAR_THRESHOLD) {
      return 'drowsy';
    }
    
    // Check for distraction (looking down)
    if (headPose.pitch > this.DISTRACTION_PITCH_THRESHOLD) {
      return 'distracted';
    }
    
    // Check for relaxing (looking sideways or up)
    if (Math.abs(headPose.yaw) > this.RELAXING_YAW_THRESHOLD || headPose.pitch < -15) {
      return 'relaxing';
    }
    
    // Default to focused if not showing other behaviors
    return 'focused';
  }

  /**
   * Apply time-based logic to prevent rapid state changes
   */
  private applyTimeBasedLogic(immediateState: FocusState): FocusState {
    const currentTime = Date.now();
    
    // If state changed, update timer
    if (immediateState !== this.currentState) {
      this.stateStartTime = currentTime;
      this.currentState = immediateState;
    }
    
    const stateTime = currentTime - this.stateStartTime;
    
    // Apply specific time thresholds for each state
    switch (immediateState) {
      case 'drowsy':
        // Alert immediately for drowsiness after threshold
        return stateTime >= this.DROWSY_TIME_THRESHOLD ? 'drowsy' : this.getPreviousValidState();
        
      case 'distracted':
        // Wait for distraction threshold
        return stateTime >= this.DISTRACTION_TIME_THRESHOLD ? 'distracted' : this.getPreviousValidState();
        
      case 'relaxing':
        // Wait for relaxing threshold
        return stateTime >= this.RELAXING_TIME_THRESHOLD ? 'relaxing' : this.getPreviousValidState();
        
      case 'focused':
        // Focused state is immediate
        return 'focused';
        
      default:
        return 'unknown';
    }
  }

  /**
   * Get the previous valid state (fallback to focused)
   */
  private getPreviousValidState(): FocusState {
    // For now, default to focused when in transition
    // In a more sophisticated implementation, you'd track state history
    return 'focused';
  }

  /**
   * Calculate confidence score for the detection
   */
  private calculateConfidence(headPose: any, eyeAspectRatio: number, state: FocusState): number {
    let confidence = 0.5; // Base confidence
    
    switch (state) {
      case 'drowsy':
        // Higher confidence when EAR is very low
        confidence = Math.max(0.1, 1 - (eyeAspectRatio / this.DROWSY_EAR_THRESHOLD));
        break;
        
      case 'distracted':
        // Higher confidence with more extreme downward angle
        const pitchFactor = Math.min(headPose.pitch / 45, 1); // Normalize to 45 degrees max
        confidence = Math.max(0.3, pitchFactor);
        break;
        
      case 'relaxing':
        // Higher confidence with more extreme sideways angle
        const yawFactor = Math.min(Math.abs(headPose.yaw) / 60, 1); // Normalize to 60 degrees max
        confidence = Math.max(0.3, yawFactor);
        break;
        
      case 'focused':
        // Higher confidence when measurements are close to neutral
        const pitchScore = 1 - Math.abs(headPose.pitch) / 45;
        const yawScore = 1 - Math.abs(headPose.yaw) / 60;
        const earScore = eyeAspectRatio > this.DROWSY_EAR_THRESHOLD ? 1 : 0;
        confidence = (pitchScore + yawScore + earScore) / 3;
        break;
        
      default:
        confidence = 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Reset all timers
   */
  private resetTimers(): void {
    this.stateTimers.clear();
    this.stateStartTime = Date.now();
  }

  /**
   * Get the current state
   */
  public getCurrentState(): FocusState {
    return this.currentState;
  }

  /**
   * Reset the detector state
   */
  public reset(): void {
    this.currentState = 'unknown';
    this.resetTimers();
  }
}
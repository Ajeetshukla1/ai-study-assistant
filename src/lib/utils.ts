import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate the Eye Aspect Ratio (EAR) from eye landmarks
 * @param eyeLandmarks - Array of eye landmark points
 * @returns EAR value
 */
export function calculateEAR(eyeLandmarks: any[]): number {
  if (!eyeLandmarks || eyeLandmarks.length < 6) return 0;

  // Calculate vertical distances
  const vertical1 = Math.sqrt(
    Math.pow(eyeLandmarks[1].x - eyeLandmarks[5].x, 2) +
    Math.pow(eyeLandmarks[1].y - eyeLandmarks[5].y, 2)
  );
  
  const vertical2 = Math.sqrt(
    Math.pow(eyeLandmarks[2].x - eyeLandmarks[4].x, 2) +
    Math.pow(eyeLandmarks[2].y - eyeLandmarks[4].y, 2)
  );

  // Calculate horizontal distance
  const horizontal = Math.sqrt(
    Math.pow(eyeLandmarks[0].x - eyeLandmarks[3].x, 2) +
    Math.pow(eyeLandmarks[0].y - eyeLandmarks[3].y, 2)
  );

  // Calculate EAR
  const ear = (vertical1 + vertical2) / (2 * horizontal);
  return ear;
}

/**
 * Calculate head pose angles from face landmarks
 * @param landmarks - Face landmarks from MediaPipe
 * @returns Object containing pitch, yaw, and roll angles
 */
export function calculateHeadPose(landmarks: any[]): { pitch: number; yaw: number; roll: number } {
  if (!landmarks || landmarks.length === 0) {
    return { pitch: 0, yaw: 0, roll: 0 };
  }

  // Use specific landmark points for head pose calculation
  // These are approximate indices for MediaPipe face mesh
  const nose = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const chin = landmarks[175];
  const forehead = landmarks[10];

  if (!nose || !leftEye || !rightEye || !chin || !forehead) {
    return { pitch: 0, yaw: 0, roll: 0 };
  }

  // Calculate yaw (left/right rotation)
  const eyeDistance = Math.abs(leftEye.x - rightEye.x);
  const noseToLeftEye = Math.abs(nose.x - leftEye.x);
  const noseToRightEye = Math.abs(nose.x - rightEye.x);
  
  let yaw = 0;
  if (eyeDistance > 0) {
    yaw = ((noseToRightEye - noseToLeftEye) / eyeDistance) * 45; // Scale to degrees
  }

  // Calculate pitch (up/down rotation)
  const verticalDistance = Math.abs(forehead.y - chin.y);
  const noseVerticalPosition = (nose.y - forehead.y) / verticalDistance;
  const pitch = (noseVerticalPosition - 0.4) * 90; // Scale to degrees, 0.4 is approximately neutral

  // Calculate roll (tilt rotation)
  const eyeSlope = (rightEye.y - leftEye.y) / (rightEye.x - leftEye.x);
  const roll = Math.atan(eyeSlope) * (180 / Math.PI);

  return {
    pitch: Math.max(-90, Math.min(90, pitch)),
    yaw: Math.max(-90, Math.min(90, yaw)),
    roll: Math.max(-45, Math.min(45, roll))
  };
}

/**
 * Format time in MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate focus score percentage
 * @param focusedTime - Time spent focused in seconds
 * @param totalTime - Total session time in seconds
 * @returns Focus score as percentage
 */
export function calculateFocusScore(focusedTime: number, totalTime: number): number {
  if (totalTime === 0) return 0;
  return Math.round((focusedTime / totalTime) * 100);
}

/**
 * Generate a unique session ID
 * @returns Unique session ID string
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current time of day category
 * @returns Time category string
 */
export function getTimeOfDay(): string {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

/**
 * Debounce function to limit function calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if browser supports required features
 * @returns Object indicating feature support
 */
export function checkBrowserSupport() {
  return {
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    webgl: !!document.createElement('canvas').getContext('webgl'),
    webAssembly: typeof WebAssembly === 'object'
  };
}
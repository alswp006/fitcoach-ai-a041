/**
 * Pose estimation hook with rep counting and form feedback.
 * Packet 0011 — stub with type definitions only.
 *
 * Uses MoveNet + TensorFlow.js for on-device pose detection.
 */

import { useState, useEffect, useRef } from "react";
import type { Exercise } from "@/lib/types";
import { calculateAngle } from "@/lib/pose-math";

export { calculateAngle };

export interface PoseHookResult {
  /** Current rep count */
  reps: number;

  /** Form score (0-100) */
  formScore: number;

  /** Current feedback string (empty if no feedback) */
  currentFeedback: string;

  /** Feedback counts: { feedbackString: count, ... } */
  feedbackCounts: Record<string, number>;

  /** Hook state: 'loading' | 'ready' | 'error' */
  state: "loading" | "ready" | "error";
}

/**
 * Estimate pose from video element and count reps.
 *
 * @param videoEl Video element streaming user's body
 * @param exercise Exercise definition with joint rules
 * @returns Pose hook result with reps, form score, and feedback
 */
export function usePose(videoEl: HTMLVideoElement, exercise: Exercise): PoseHookResult {
  // TODO: Implement pose estimation with MoveNet
  // 1. Load pose model (MoveNet/TensorFlow.js)
  // 2. Run inference loop via requestAnimationFrame
  // 3. Calculate angles for each JointRule
  // 4. Track rep count on threshold crossings
  // 5. Accumulate feedback counts
  // 6. Return state, reps, formScore, currentFeedback, feedbackCounts
  // 7. Cancel rAF and cleanup on unmount

  const [reps, setReps] = useState(0);
  const [formScore, setFormScore] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState("");
  const [feedbackCounts, setFeedbackCounts] = useState<Record<string, number>>({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // TODO: Initialize pose model and rAF loop
    return () => {
      // Cleanup: cancel rAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [videoEl, exercise]);

  return {
    reps,
    formScore,
    currentFeedback,
    feedbackCounts,
    state,
  };
}

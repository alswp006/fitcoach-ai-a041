// Entity Types — 8 domain models from SPEC
export interface UserProfile {
  id: string;
  nickname: string;
  gender: 'male' | 'female' | 'none';
  age: number;
  heightCm: number;
  weightKg: number;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goal: 'diet' | 'muscle' | 'health' | 'flexibility';
  weeklyTargetDays: number;
  createdAt: number;
}

export interface JointRule {
  joint: 'knee' | 'hip' | 'elbow' | 'shoulder' | 'back';
  minAngle: number;
  maxAngle: number;
  feedbackLow: string;
  feedbackHigh: string;
}

export interface Exercise {
  id: string;
  name: string;
  targetMuscle: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isFree: boolean;
  keyJoints: JointRule[];
  guideText: string;
}

export interface WorkoutPlan {
  id: string;
  weekOf: string;
  exerciseIds: string[];
  aiGenerated: true;
  generatedAt: number;
  summary: string;
}

export interface WorkoutSession {
  id: string;
  exerciseId: string;
  date: string;
  startedAt: number;
  durationSec: number;
  totalReps: number;
  avgFormScore: number;
  caloriesBurned: number;
  feedbackCounts: Record<string, number>;
}

export interface AnalysisReport {
  sessionId: string;
  formScore: number;
  improvements: string[];
  muscleActivation: { muscle: string; percent: number }[];
  caloriesBurned: number;
  aiGenerated: true;
  createdAt: number;
}

export interface Challenge {
  id: string;
  title: string;
  targetDays: number;
  joinedAt: number;
  completedDates: string[];
  shareCode: string;
}

export interface AppFlags {
  aiNoticeAcknowledged: boolean;
  onboardingDone: boolean;
  isPremium: boolean;
  premiumUntil: number | null;
}

// API Contract Types — request/response for external Railway API
export interface PlanRequest {
  gender: 'male' | 'female' | 'none';
  age: number;
  heightCm: number;
  weightKg: number;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goal: 'diet' | 'muscle' | 'health' | 'flexibility';
  weeklyTargetDays: number;
  availableExerciseIds: string[];
}

export interface PlanResponse {
  exerciseIds: string[];
  summary: string;
}

export interface ReportRequest {
  exerciseId: string;
  totalReps: number;
  durationSec: number;
  avgFormScore: number;
  feedbackCounts: Record<string, number>;
  weightKg: number;
}

export interface ReportResponse {
  formScore: number;
  improvements: string[];
  muscleActivation: { muscle: string; percent: number }[];
  caloriesBurned: number;
}

export interface ApiError {
  error: string;
}

// Storage Operation Result — for localStorage crud with error recovery
export type StorageResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'parse' };

// React Router state contract for all routes
export interface RouteState {
  '/': undefined;
  '/onboarding': undefined;
  '/plan': undefined;
  '/workout/:exerciseId': { exerciseId: string } | undefined;
  '/report/:sessionId': { sessionId: string };
  '/challenges': undefined;
  '/premium': undefined;
}

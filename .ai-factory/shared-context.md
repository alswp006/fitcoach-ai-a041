# Shared Context (auto-generated — do NOT modify)


## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
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

// ...truncated
```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export interface UserProfile; export interface JointRule; export interface Exercise; export interface WorkoutPlan; export interface WorkoutSession; export interface AnalysisReport; export interface Challenge; export interface AppFlags
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState + API 계약 정의 (files: src/lib/types.ts)
- 0002: Exercise 정적 카탈로그 (files: src/lib/exercises.ts)
- 0003: localStorage 저수준 래퍼 + 프로필/플래그 CRUD (files: src/lib/storage.ts)
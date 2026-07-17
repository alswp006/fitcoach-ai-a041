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
    useCamera.ts
  lib/
    AppContext.tsx
    api.ts
    date.ts
    exercises.ts
    promo.ts
    speech.ts
    storage.challenges.ts
    storage.plans.ts
    storage.sessions.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    Onboarding.tsx
    Premium.tsx
    Report.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- api.ts: export async function postPlan(req: PlanRequest): Promise<Result<PlanResponse>>; export async function postReport(req: ReportRequest): Promise<Result<ReportResponse>>
- date.ts: export function getThisWeekMonday(): string; export function getTodayDateString(): string
- exercises.ts: export const exercises: Exercise[] = [squat, pushup, plank, lunge, burpee, mountainclimber]; export function getExerciseById(id: string): Exercise | undefined; export function getAllExercises(): Exercise[]; export function getFreeExercises(): Exercise[]
- promo.ts: export async function grantPromo( promotionCode: string, amount: number ): Promise<
- speech.ts: export function speak(text: string): void
- storage.challenges.ts: export interface Challenge; export interface CompletionResult; export function getChallenges(): Challenge[]; export function joinChallenge(id: string, challenge: Challenge): void; export function completeToday(challengeId: string): CompletionResult; export function generateShareCode(): string
- storage.plans.ts: export interface WorkoutPlan; export function getPlans(): WorkoutPlan[]; export function savePlan(plan: WorkoutPlan): void; export function getPlanForWeek(weekOf: string): WorkoutPlan | undefined
- storage.sessions.ts: export function getSessions(): WorkoutSession[]; export function getSessionById(id: string): WorkoutSession | undefined; export async function addSession( session: WorkoutSession ): Promise<StorageResult>; export function getReports(): AnalysisReport[]; export function getReportBySessionId( sessionId: string ): AnalysisReport | undefined; export async function saveReport( report: AnalysisReport ): Promise<StorageResult>
- storage.ts: export const LS_KEYS =; export function safeGet<T>(key: string, fallback: T): T; export function safeSet<T>(key: string, value: T): StorageOutcome; export function getProfile<T = any>(): T | null; export function saveProfile<T extends object>(profile: T): StorageOutcome; export function getFlags<T extends object = AppFlags>(): T; export function saveFlags<T extends object>(flags: T): StorageOutcome; export function patchFlags<T extends object = AppFlags>( partial: Partial<T> ): StorageOutcome
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

### Module Dependencies (import graph)
  lib/api.ts → imports: lib/types
  lib/exercises.ts → imports: lib/types
  lib/storage.challenges.ts → imports: lib/storage, lib/date
  lib/storage.plans.ts → imports: lib/storage
  lib/storage.sessions.ts → imports: lib/types, lib/storage
  lib/storage.ts → imports: lib/types
  pages/Onboarding.tsx → imports: components/ScreenScaffold, components/BottomCTA, lib/storage, lib/types
  pages/Premium.tsx → imports: components/ScreenScaffold, components/Card, components/TossPurchase, lib/AppContext, lib/utils
  pages/Report.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Card, components/MiniBar, components/StateView, components/TossRewardAd, lib/AppContext, lib/storage.sessions, lib/api, lib/utils, lib/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState + API 계약 정의 (files: src/lib/types.ts)
- 0002: Exercise 정적 카탈로그 (files: src/lib/exercises.ts)
- 0003: localStorage 저수준 래퍼 + 프로필/플래그 CRUD (files: src/lib/storage.ts)
- 0007: 환경변수 예시 파일 정리 (files: .env.example)
- 0004: 세션/리포트 저장소 (200개 상한 + quota 재시도) (files: src/lib/storage.sessions.ts)
- 0006: AppContext (플래그·프로필·프리미엄 만료 검사) (files: src/lib/AppContext.tsx, src/main.tsx)
- 0008: AI API 클라이언트 (plan · report) (files: src/lib/api.ts)
- 0009: 프로모션 리워드 유틸 (5,000원 클램프) (files: src/lib/promo.ts)
- 0012: 온보딩 페이지 /onboarding (files: src/pages/Onboarding.tsx)
- 0016: AI 리포트 페이지 /report/:sessionId (files: src/pages/Report.tsx)
- 0018: 프리미엄 페이지 /premium (files: src/pages/Premium.tsx)
- 0005: 플랜/챌린지 저장소 + 날짜 유틸 (files: src/lib/storage.plans.ts, src/lib/storage.challenges.ts, src/lib/date.ts)
- 0010: 카메라 훅 + 음성 피드백 유틸 (files: src/hooks/useCamera.ts, src/lib/speech.ts)
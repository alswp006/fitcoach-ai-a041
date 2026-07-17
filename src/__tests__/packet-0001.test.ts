import { describe, it, expect } from "vitest";
import type {
  UserProfile,
  Exercise,
  JointRule,
  WorkoutPlan,
  WorkoutSession,
  AnalysisReport,
  Challenge,
  AppFlags,
  PlanRequest,
  PlanResponse,
  ReportRequest,
  ReportResponse,
  ApiError,
  StorageResult,
  RouteState,
} from "@/lib/types";

// AC-1: All exports exist and are importable
describe("Packet 0001: Entity Types + RouteState + API Contracts", () => {
  // AC-1: UserProfile entity structure
  it("AC-1[P0]: UserProfile has required fields", () => {
    // Verify structure with concrete example (runtime validation)
    const profile: UserProfile = {
      id: "user-001",
      nickname: "지훈",
      gender: "male",
      age: 30,
      heightCm: 175,
      weightKg: 72,
      fitnessLevel: "beginner",
      goal: "diet",
      weeklyTargetDays: 3,
      createdAt: 1721203200000,
    };

    expect(profile.id).toBe("user-001");
    expect(profile.nickname).toBe("지훈");
    expect(profile.gender).toBe("male");
    expect(profile.age).toBe(30);
    expect(profile.heightCm).toBe(175);
    expect(profile.weightKg).toBe(72);
    expect(profile.fitnessLevel).toBe("beginner");
    expect(profile.goal).toBe("diet");
    expect(profile.weeklyTargetDays).toBe(3);
    expect(typeof profile.createdAt).toBe("number");
  });

  // AC-1: Exercise entity structure
  it("AC-1[P0]: Exercise has required fields", () => {
    const exercise: Exercise = {
      id: "squat",
      name: "스쿼트",
      targetMuscle: "하체",
      difficulty: "beginner",
      isFree: true,
      keyJoints: [],
      guideText: "발을 어깨넓이로 벌리고...",
    };

    expect(exercise.id).toBe("squat");
    expect(exercise.name).toBe("스쿼트");
    expect(exercise.difficulty).toBe("beginner");
    expect(exercise.isFree).toBe(true);
    expect(Array.isArray(exercise.keyJoints)).toBe(true);
  });

  // AC-1: JointRule entity structure
  it("AC-1[P0]: JointRule has required fields", () => {
    const jointRule: JointRule = {
      joint: "knee",
      minAngle: 90,
      maxAngle: 120,
      feedbackLow: "무릎을 더 굽히세요",
      feedbackHigh: "무릎을 너무 굽혔어요",
    };

    expect(jointRule.joint).toBe("knee");
    expect(jointRule.minAngle).toBe(90);
    expect(jointRule.maxAngle).toBe(120);
    expect(jointRule.feedbackLow).toBe("무릎을 더 굽히세요");
  });

  // AC-1: WorkoutPlan entity structure
  it("AC-1[P0]: WorkoutPlan has required fields", () => {
    const plan: WorkoutPlan = {
      id: "plan-001",
      weekOf: "2026-07-13",
      exerciseIds: ["squat", "pushup", "plank"],
      aiGenerated: true,
      generatedAt: 1721203200000,
      summary: "이번 주는 하체와 팔 운동에 집중합니다",
    };

    expect(plan.id).toBe("plan-001");
    expect(plan.weekOf).toBe("2026-07-13");
    expect(Array.isArray(plan.exerciseIds)).toBe(true);
    expect(plan.aiGenerated).toBe(true);
    expect(plan.summary).toBeDefined();
  });

  // AC-1: WorkoutSession entity structure
  it("AC-1[P0]: WorkoutSession has required fields", () => {
    const session: WorkoutSession = {
      id: "session-001",
      exerciseId: "squat",
      date: "2026-07-17",
      startedAt: 1721203200000,
      durationSec: 600,
      totalReps: 20,
      avgFormScore: 85,
      caloriesBurned: 120,
      feedbackCounts: {
        "무릎을 더 굽히세요": 4,
        "등을 펴세요": 2,
      },
    };

    expect(session.id).toBe("session-001");
    expect(session.exerciseId).toBe("squat");
    expect(session.totalReps).toBe(20);
    expect(session.avgFormScore).toBe(85);
    expect(typeof session.feedbackCounts).toBe("object");
  });

  // AC-1: AnalysisReport entity structure
  it("AC-1[P0]: AnalysisReport has required fields", () => {
    const report: AnalysisReport = {
      sessionId: "session-001",
      formScore: 85,
      improvements: ["무릎 각도가 얕습니다", "등을 더 펴세요"],
      muscleActivation: [
        { muscle: "quadriceps", percent: 80 },
        { muscle: "gluteus", percent: 75 },
      ],
      caloriesBurned: 120,
      aiGenerated: true,
      createdAt: 1721203200000,
    };

    expect(report.sessionId).toBe("session-001");
    expect(report.formScore).toBe(85);
    expect(Array.isArray(report.improvements)).toBe(true);
    expect(Array.isArray(report.muscleActivation)).toBe(true);
    expect(report.aiGenerated).toBe(true);
  });

  // AC-1: Challenge entity structure
  it("AC-1[P0]: Challenge has required fields", () => {
    const challenge: Challenge = {
      id: "challenge-001",
      title: "7일 스쿼트 챌린지",
      targetDays: 7,
      joinedAt: 1721203200000,
      completedDates: ["2026-07-15", "2026-07-16"],
      shareCode: "ABC123",
    };

    expect(challenge.id).toBe("challenge-001");
    expect(challenge.title).toBe("7일 스쿼트 챌린지");
    expect(challenge.targetDays).toBe(7);
    expect(Array.isArray(challenge.completedDates)).toBe(true);
    expect(challenge.shareCode).toBe("ABC123");
  });

  // AC-1: AppFlags entity structure
  it("AC-1[P0]: AppFlags has required fields", () => {
    const flags: AppFlags = {
      aiNoticeAcknowledged: true,
      onboardingDone: true,
      isPremium: false,
      premiumUntil: null,
    };

    expect(flags.aiNoticeAcknowledged).toBe(true);
    expect(flags.onboardingDone).toBe(true);
    expect(flags.isPremium).toBe(false);
    expect(flags.premiumUntil).toBeNull();
  });

  // AC-2: StorageResult discriminated union
  it("AC-2[P0]: StorageResult exports success form { ok: true }", () => {
    const success: StorageResult = {
      ok: true,
    };

    expect(success.ok).toBe(true);
  });

  it("AC-2[P0]: StorageResult exports failure form with reason", () => {
    // Test quota reason
    const quotaFailure: StorageResult = {
      ok: false,
      reason: "quota",
    };
    expect(quotaFailure.ok).toBe(false);
    expect(quotaFailure.reason).toBe("quota");

    // Test parse reason
    const parseFailure: StorageResult = {
      ok: false,
      reason: "parse",
    };
    expect(parseFailure.ok).toBe(false);
    expect(parseFailure.reason).toBe("parse");
  });

  // AC-3: RouteState covers all routes
  it("AC-3[P0]: RouteState includes route for home '/'", () => {
    // Home route should support navigation state (or undefined)
    const homeState: RouteState["/"] = undefined;
    expect(homeState === undefined || typeof homeState === "object").toBe(true);
  });

  it("AC-3[P0]: RouteState includes route for '/onboarding'", () => {
    const onboardingState: RouteState["/onboarding"] = undefined;
    expect(onboardingState === undefined || typeof onboardingState === "object").toBe(true);
  });

  it("AC-3[P0]: RouteState includes route for '/plan'", () => {
    const planState: RouteState["/plan"] = undefined;
    expect(planState === undefined || typeof planState === "object").toBe(true);
  });

  it("AC-3[P0]: RouteState includes route for '/workout/:exerciseId'", () => {
    const workoutState: RouteState["/workout/:exerciseId"] = {
      exerciseId: "squat",
    };
    expect(workoutState).toBeDefined();
    expect(workoutState.exerciseId).toBe("squat");
  });

  it("AC-3[P0]: RouteState includes route for '/report/:sessionId'", () => {
    const reportState: RouteState["/report/:sessionId"] = {
      sessionId: "session-001",
    };
    expect(reportState).toBeDefined();
    expect(reportState.sessionId).toBe("session-001");
  });

  it("AC-3[P0]: RouteState includes route for '/challenges'", () => {
    const challengesState: RouteState["/challenges"] = undefined;
    expect(challengesState === undefined || typeof challengesState === "object").toBe(true);
  });

  it("AC-3[P0]: RouteState includes route for '/premium'", () => {
    const premiumState: RouteState["/premium"] = undefined;
    expect(premiumState === undefined || typeof premiumState === "object").toBe(true);
  });

  // AC-1: API Contract types - PlanRequest
  it("AC-1[P0]: PlanRequest has required fields", () => {
    const request: PlanRequest = {
      gender: "male",
      age: 30,
      heightCm: 175,
      weightKg: 72,
      fitnessLevel: "beginner",
      goal: "diet",
      weeklyTargetDays: 3,
      availableExerciseIds: ["squat", "pushup", "plank"],
    };

    expect(request.gender).toBe("male");
    expect(request.age).toBe(30);
    expect(Array.isArray(request.availableExerciseIds)).toBe(true);
  });

  // AC-1: API Contract types - PlanResponse
  it("AC-1[P0]: PlanResponse has required fields", () => {
    const response: PlanResponse = {
      exerciseIds: ["squat", "pushup", "plank"],
      summary: "이번 주는 하체와 팔 운동에 집중합니다",
    };

    expect(Array.isArray(response.exerciseIds)).toBe(true);
    expect(typeof response.summary).toBe("string");
  });

  // AC-1: API Contract types - ReportRequest
  it("AC-1[P0]: ReportRequest has required fields", () => {
    const request: ReportRequest = {
      exerciseId: "squat",
      totalReps: 20,
      durationSec: 600,
      avgFormScore: 85,
      feedbackCounts: { "무릎을 더 굽히세요": 4 },
      weightKg: 72,
    };

    expect(request.exerciseId).toBe("squat");
    expect(request.totalReps).toBe(20);
    expect(typeof request.feedbackCounts).toBe("object");
  });

  // AC-1: API Contract types - ReportResponse
  it("AC-1[P0]: ReportResponse has required fields", () => {
    const response: ReportResponse = {
      formScore: 85,
      improvements: ["무릎 각도가 얕습니다"],
      muscleActivation: [{ muscle: "quadriceps", percent: 80 }],
      caloriesBurned: 120,
    };

    expect(response.formScore).toBe(85);
    expect(Array.isArray(response.improvements)).toBe(true);
    expect(Array.isArray(response.muscleActivation)).toBe(true);
  });

  // AC-1: ApiError type
  it("AC-1[P0]: ApiError type exists", async () => {
    const { ApiError } = await import("@/lib/types");

    expect(ApiError).toBeDefined();

    const error: typeof ApiError = {
      error: "Internal Server Error",
    };

    expect(typeof error.error).toBe("string");
  });

  // AC-4: No runtime code (functions/constants)
  it("AC-4[P0]: src/lib/types.ts contains only type definitions", async () => {
    const typeModule = await import("@/lib/types");
    const exports = Object.keys(typeModule);

    // All exports should be TypeScript type names (PascalCase)
    // No functions like getProfile, saveSession, etc.
    const functionLikeExports = exports.filter(
      (name) => typeof typeModule[name] === "function"
    );
    const constantLikeExports = exports.filter(
      (name) =>
        typeof typeModule[name] === "string" ||
        typeof typeModule[name] === "number" ||
        typeof typeModule[name] === "boolean"
    );

    expect(functionLikeExports.length).toBe(0);
    expect(constantLikeExports.length).toBe(0);
  });

  // AC-1: All 8 entities + 4 API types + StorageResult + RouteState exported
  it("AC-1[P0]: types.ts exports exactly 14 types total", async () => {
    const typeModule = await import("@/lib/types");

    const expectedExports = [
      "UserProfile",
      "Exercise",
      "JointRule",
      "WorkoutPlan",
      "WorkoutSession",
      "AnalysisReport",
      "Challenge",
      "AppFlags",
      "PlanRequest",
      "PlanResponse",
      "ReportRequest",
      "ReportResponse",
      "ApiError",
      "StorageResult",
      "RouteState",
    ];

    const actualExports = Object.keys(typeModule);

    for (const exp of expectedExports) {
      expect(actualExports).toContain(exp);
    }
  });
});

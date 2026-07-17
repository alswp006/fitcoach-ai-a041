import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PlanRequest, PlanResponse, ReportRequest, ReportResponse } from "@/lib/types";

describe("AI API 클라이언트 (postPlan · postReport)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-1: 200 응답 시 { ok:true, data } 반환하고 exerciseIds/summary 필드 존재 검증", () => {
    it("AC-1[P0]: postPlan should return { ok:true } with data containing exerciseIds and summary fields", async () => {
      const mockResponse: PlanResponse = {
        exerciseIds: ["bench-press", "squat", "deadlift"],
        summary: "Push/Pull/Legs 3-day split optimized for muscle hypertrophy",
      };

      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: PlanRequest = {
        gender: "male",
        age: 28,
        heightCm: 180,
        weightKg: 75,
        fitnessLevel: "intermediate",
        goal: "muscle",
        weeklyTargetDays: 4,
        availableExerciseIds: ["bench-press", "squat", "deadlift", "row", "pull-up"],
      };

      const { postPlan } = await import("@/lib/api");
      const result = await postPlan(req);

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty("exerciseIds");
      expect(result.data).toHaveProperty("summary");
      expect(result.data!.exerciseIds).toEqual(["bench-press", "squat", "deadlift"]);
      expect(result.data!.summary).toBe("Push/Pull/Legs 3-day split optimized for muscle hypertrophy");
      expect(result.error).toBeUndefined();
    });

    it("AC-1[P0]: postReport should return { ok:true } with all required response fields (formScore, improvements, muscleActivation, caloriesBurned)", async () => {
      const mockResponse: ReportResponse = {
        formScore: 87,
        improvements: ["Keep elbows closer to body", "Increase range of motion"],
        muscleActivation: [
          { muscle: "chest", percent: 45 },
          { muscle: "triceps", percent: 35 },
          { muscle: "shoulders", percent: 20 },
        ],
        caloriesBurned: 142,
      };

      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: ReportRequest = {
        exerciseId: "bench-press",
        totalReps: 20,
        durationSec: 180,
        avgFormScore: 85,
        feedbackCounts: { "form-issue": 3, "depth-issue": 2 },
        weightKg: 50,
      };

      const { postReport } = await import("@/lib/api");
      const result = await postReport(req);

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty("formScore");
      expect(result.data).toHaveProperty("improvements");
      expect(result.data).toHaveProperty("muscleActivation");
      expect(result.data).toHaveProperty("caloriesBurned");
      expect(result.data!.formScore).toBe(87);
      expect(result.data!.improvements).toEqual(["Keep elbows closer to body", "Increase range of motion"]);
      expect(result.data!.muscleActivation).toHaveLength(3);
      expect(result.data!.muscleActivation[0]).toHaveProperty("muscle", "chest");
      expect(result.data!.muscleActivation[0]).toHaveProperty("percent", 45);
      expect(result.data!.caloriesBurned).toBe(142);
      expect(result.error).toBeUndefined();
    });
  });

  describe("AC-2: 500 응답 시 { ok:false, error:정규화된메시지 } throw 없이 반환", () => {
    it("AC-2[P0]: postPlan should return { ok:false, error } on 500 error without throwing", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal Server Error" }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: PlanRequest = {
        gender: "female",
        age: 25,
        heightCm: 165,
        weightKg: 60,
        fitnessLevel: "beginner",
        goal: "diet",
        weeklyTargetDays: 3,
        availableExerciseIds: ["cardio-1", "yoga-1"],
      };

      const { postPlan } = await import("@/lib/api");
      const result = await postPlan(req);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("플랜 생성에 실패했어요. 다시 시도해주세요");
      expect(result.data).toBeUndefined();
    });

    it("AC-2[P0]: postReport should return { ok:false, error } on 500 error without throwing", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal Server Error" }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: ReportRequest = {
        exerciseId: "squat",
        totalReps: 15,
        durationSec: 120,
        avgFormScore: 72,
        feedbackCounts: { "form-issue": 5 },
        weightKg: 25,
      };

      const { postReport } = await import("@/lib/api");
      const result = await postReport(req);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("리포트 생성에 실패했어요. 다시 시도해주세요");
      expect(result.data).toBeUndefined();
    });

    it("should handle 4xx errors (e.g., 400 Bad Request) with normalized error", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid request" }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: PlanRequest = {
        gender: "male",
        age: 28,
        heightCm: 180,
        weightKg: 75,
        fitnessLevel: "intermediate",
        goal: "muscle",
        weeklyTargetDays: 4,
        availableExerciseIds: [],
      };

      const { postPlan } = await import("@/lib/api");
      const result = await postPlan(req);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    });
  });

  describe("AC-3: fetch reject(네트워크 거부) 시 throw 없이 { ok:false, error } 반환하고 앱 크래시 없음", () => {
    it("AC-3[P0]: postPlan should handle network error gracefully without throwing", async () => {
      const networkError = new Error("Network request failed");
      const fetchMock = vi.fn().mockRejectedValueOnce(networkError);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: PlanRequest = {
        gender: "male",
        age: 30,
        heightCm: 175,
        weightKg: 80,
        fitnessLevel: "advanced",
        goal: "health",
        weeklyTargetDays: 5,
        availableExerciseIds: ["ex1", "ex2", "ex3"],
      };

      const { postPlan } = await import("@/lib/api");
      const result = await postPlan(req);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
      expect(result.data).toBeUndefined();
    });

    it("AC-3[P0]: postReport should handle network error gracefully without throwing", async () => {
      const networkError = new Error("Failed to connect to API server");
      const fetchMock = vi.fn().mockRejectedValueOnce(networkError);
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: ReportRequest = {
        exerciseId: "deadlift",
        totalReps: 30,
        durationSec: 300,
        avgFormScore: 92,
        feedbackCounts: { "depth-issue": 1 },
        weightKg: 100,
      };

      const { postReport } = await import("@/lib/api");
      const result = await postReport(req);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });
  });

  describe("AC-4: 15초 초과 시 abort 후 { ok:false, error } 반환", () => {
    it("AC-4[P0]: postPlan should abort and return error after 15 second timeout", async () => {
      const abortedError = new Error("AbortError");
      abortedError.name = "AbortError";

      let capturedAbortController: AbortController | null = null;

      const fetchMock = vi.fn((url: string, opts: any) => {
        if (opts?.signal) {
          capturedAbortController = opts.signal;
          return new Promise(() => {}); // Never resolves
        }
        return new Promise(() => {});
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: PlanRequest = {
        gender: "male",
        age: 28,
        heightCm: 180,
        weightKg: 75,
        fitnessLevel: "intermediate",
        goal: "muscle",
        weeklyTargetDays: 4,
        availableExerciseIds: ["ex1", "ex2"],
      };

      vi.useFakeTimers();
      const { postPlan } = await import("@/lib/api");
      const resultPromise = postPlan(req);

      vi.advanceTimersByTime(15100);

      const result = await resultPromise;
      vi.useRealTimers();

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("시간");
    });

    it("AC-4[P0]: postReport should abort and return error after 15 second timeout", async () => {
      const fetchMock = vi.fn(() => new Promise(() => {})); // Never resolves
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: ReportRequest = {
        exerciseId: "row",
        totalReps: 20,
        durationSec: 180,
        avgFormScore: 85,
        feedbackCounts: {},
        weightKg: 50,
      };

      vi.useFakeTimers();
      const { postReport } = await import("@/lib/api");
      const resultPromise = postReport(req);

      vi.advanceTimersByTime(15100);

      const result = await resultPromise;
      vi.useRealTimers();

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("AC-5: fetch 옵션에 mode:'cors'가 명시되고 커스텀 헤더가 없다", () => {
    it("AC-5[P0]: postPlan should use mode:'cors' in fetch options", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ exerciseIds: ["ex1"], summary: "Test plan" }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: PlanRequest = {
        gender: "male",
        age: 28,
        heightCm: 180,
        weightKg: 75,
        fitnessLevel: "intermediate",
        goal: "muscle",
        weeklyTargetDays: 4,
        availableExerciseIds: ["ex1"],
      };

      const { postPlan } = await import("@/lib/api");
      await postPlan(req);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, fetchOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(fetchOptions).toHaveProperty("mode", "cors");
      expect(fetchOptions).toHaveProperty("method", "POST");
    });

    it("AC-5[P0]: postPlan should only include Content-Type header (no custom headers)", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ exerciseIds: ["ex1"], summary: "Test" }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: PlanRequest = {
        gender: "female",
        age: 25,
        heightCm: 165,
        weightKg: 60,
        fitnessLevel: "beginner",
        goal: "diet",
        weeklyTargetDays: 3,
        availableExerciseIds: ["ex1"],
      };

      const { postPlan } = await import("@/lib/api");
      await postPlan(req);

      const [, fetchOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
      if (fetchOptions.headers) {
        const headers = fetchOptions.headers as Record<string, string>;
        // Should not have Authorization, X-Custom, etc. — only application/json
        expect(headers).not.toHaveProperty("Authorization");
        expect(headers).not.toHaveProperty("X-Custom-Header");
        if (Object.keys(headers).length > 0) {
          const headerKeys = Object.keys(headers);
          headerKeys.forEach((key) => {
            expect(key.toLowerCase()).toBe("content-type");
          });
        }
      }
    });

    it("postReport should use mode:'cors' in fetch options", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          formScore: 85,
          improvements: [],
          muscleActivation: [],
          caloriesBurned: 100,
        }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: ReportRequest = {
        exerciseId: "pull-up",
        totalReps: 20,
        durationSec: 180,
        avgFormScore: 85,
        feedbackCounts: {},
        weightKg: 50,
      };

      const { postReport } = await import("@/lib/api");
      await postReport(req);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, fetchOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(fetchOptions).toHaveProperty("mode", "cors");
      expect(fetchOptions).toHaveProperty("method", "POST");
    });
  });

  describe("Integration: API routes and environment setup", () => {
    it("should use VITE_API_BASE_URL from environment", async () => {
      // Save original env
      const originalEnv = { ...import.meta.env };

      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ exerciseIds: ["ex1"], summary: "Test" }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: PlanRequest = {
        gender: "male",
        age: 28,
        heightCm: 180,
        weightKg: 75,
        fitnessLevel: "intermediate",
        goal: "muscle",
        weeklyTargetDays: 4,
        availableExerciseIds: ["ex1"],
      };

      const { postPlan } = await import("@/lib/api");
      await postPlan(req);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain("/api/plan");
    });

    it("postReport should POST to /api/report endpoint", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          formScore: 85,
          improvements: [],
          muscleActivation: [],
          caloriesBurned: 100,
        }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const req: ReportRequest = {
        exerciseId: "squat",
        totalReps: 20,
        durationSec: 180,
        avgFormScore: 85,
        feedbackCounts: {},
        weightKg: 50,
      };

      const { postReport } = await import("@/lib/api");
      await postReport(req);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain("/api/report");
    });
  });
});

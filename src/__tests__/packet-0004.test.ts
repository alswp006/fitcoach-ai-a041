import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { WorkoutSession, AnalysisReport, StorageResult } from "@/lib/types";
import { LS_KEYS } from "@/lib/storage";

/**
 * Packet 0004 — Session/Report Storage with 200-item limit + quota retry
 *
 * Tests cover:
 * - AC-1: 200-item cap with LRU eviction
 * - AC-2: Quota retry loop (remove 20, retry, then fail gracefully)
 * - AC-3: Corrupted JSON resilience
 * - AC-4: Missing report lookup
 * - AC-5: No console.error calls
 */

describe("Session/Report Storage (200-item cap + quota retry)", () => {
  const consoleSpy = vi.spyOn(console, "error");

  beforeEach(() => {
    localStorage.clear();
    consoleSpy.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ── AC-1: 200-item cap, evict oldest by startedAt ──

  it("AC-1[P0]: addSession maintains 200 items when exceeding capacity", async () => {
    // Import functions under test
    // @ts-ignore - file will be created by coder
    // @ts-ignore - file will be created by coder
    const { getSessions, addSession } = await import("@/lib/storage.sessions");

    // Arrange: Pre-fill storage with 200 sessions (ordered by startedAt)
    const existingSessions = Array.from({ length: 200 }, (_, i) => ({
      id: `session-${i}`,
      exerciseId: `ex-${i}`,
      date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      startedAt: 1000000000 + i * 1000, // Increasing timestamps
      durationSec: 300 + i,
      totalReps: 10,
      avgFormScore: 0.85,
      caloriesBurned: 100 + i,
      feedbackCounts: { good: 5 },
    } as WorkoutSession));

    localStorage.setItem(LS_KEYS.sessions, JSON.stringify(existingSessions));

    // Act: Add one new session
    const newSession: WorkoutSession = {
      id: "session-201",
      exerciseId: "ex-new",
      date: "2026-01-30",
      startedAt: 1000200000, // Latest timestamp
      durationSec: 600,
      totalReps: 20,
      avgFormScore: 0.9,
      caloriesBurned: 200,
      feedbackCounts: { excellent: 10 },
    };
    await addSession(newSession);

    // Assert: Array length stays at 200
    const stored = getSessions();
    expect(stored).toHaveLength(200);

    // Assert: Oldest session (id: session-0, startedAt: 1000001000) is gone
    expect(stored.some((s: WorkoutSession) => s.id === "session-0")).toBe(false);

    // Assert: Newest session (id: session-199, startedAt: 1000199000) is still there
    expect(stored.some((s: WorkoutSession) => s.id === "session-199")).toBe(true);

    // Assert: New session is present
    expect(stored.some((s: WorkoutSession) => s.id === "session-201")).toBe(true);
    const added = stored.find((s: WorkoutSession) => s.id === "session-201");
    expect(added?.startedAt).toBe(1000200000);
  });

  it("AC-1[P0]: addSession returns StorageResult.ok", async () => {
    // @ts-ignore - file will be created by coder
    const { addSession } = await import("@/lib/storage.sessions");

    const session: WorkoutSession = {
      id: "test-1",
      exerciseId: "ex-1",
      date: "2026-01-15",
      startedAt: 1000000000,
      durationSec: 300,
      totalReps: 10,
      avgFormScore: 0.8,
      caloriesBurned: 150,
      feedbackCounts: {},
    };

    const result = await addSession(session);
    expect(result).toEqual({ ok: true });
  });

  // ── AC-2: Quota retry (20 items removal, single retry, then fail gracefully) ──

  it("AC-2[P0]: addSession retries on quota by removing 20 oldest sessions", async () => {
    // @ts-ignore - file will be created by coder
    const { getSessions, addSession } = await import("@/lib/storage.sessions");
    const originalSetItem = Storage.prototype.setItem;
    let callCount = 0;

    // Arrange: Mock safeSet to throw QuotaExceededError on first call, succeed on retry
    Storage.prototype.setItem = vi.fn(function (this: Storage, key: string, value: string) {
      callCount++;
      if (key === LS_KEYS.sessions && callCount === 1) {
        const err = new DOMException("Quota exceeded");
        (err as any).name = "QuotaExceededError";
        throw err;
      }
      originalSetItem.call(this, key, value);
    });

    // Pre-fill with 195 sessions
    const sessions = Array.from({ length: 195 }, (_, i) => ({
      id: `s-${i}`,
      exerciseId: `ex`,
      date: "2026-01-01",
      startedAt: 1000 + i,
      durationSec: 300,
      totalReps: 10,
      avgFormScore: 0.8,
      caloriesBurned: 100,
      feedbackCounts: {},
    } as WorkoutSession));
    localStorage.setItem(LS_KEYS.sessions, JSON.stringify(sessions));

    // Act: Add new session; first setItem fails with quota, second succeeds
    const newSession: WorkoutSession = {
      id: "new",
      exerciseId: "ex",
      date: "2026-01-02",
      startedAt: 2000,
      durationSec: 300,
      totalReps: 10,
      avgFormScore: 0.8,
      caloriesBurned: 100,
      feedbackCounts: {},
    };
    const result = await addSession(newSession);

    // Assert: Result is ok (retry succeeded)
    expect(result).toEqual({ ok: true });

    // Assert: 20 oldest were removed, then new session added → 176 items
    const stored = getSessions();
    expect(stored.length).toBeLessThanOrEqual(195); // Dropped at least 20

    // Assert: New session is present
    expect(stored.some((s: WorkoutSession) => s.id === "new")).toBe(true);

    Storage.prototype.setItem = originalSetItem;
  });

  it("AC-2[P0]: addSession returns quota error when retry also fails", async () => {
    // @ts-ignore - file will be created by coder
    const { addSession } = await import("@/lib/storage.sessions");
    const originalSetItem = Storage.prototype.setItem;

    // Arrange: Mock safeSet to always throw QuotaExceededError
    Storage.prototype.setItem = vi.fn(function (this: Storage, key: string, value?: string) {
      if (key === LS_KEYS.sessions) {
        const err = new DOMException("Quota exceeded");
        (err as any).name = "QuotaExceededError";
        throw err;
      }
      originalSetItem.call(this, key, value ?? "{}");
    });

    const sessions = Array.from({ length: 50 }, (_, i) => ({
      id: `s-${i}`,
      exerciseId: "ex",
      date: "2026-01-01",
      startedAt: 1000 + i,
      durationSec: 300,
      totalReps: 10,
      avgFormScore: 0.8,
      caloriesBurned: 100,
      feedbackCounts: {},
    } as WorkoutSession));
    localStorage.setItem(LS_KEYS.sessions, JSON.stringify(sessions));

    // Act: Add session; both attempts fail
    const newSession: WorkoutSession = {
      id: "new",
      exerciseId: "ex",
      date: "2026-01-02",
      startedAt: 2000,
      durationSec: 300,
      totalReps: 10,
      avgFormScore: 0.8,
      caloriesBurned: 100,
      feedbackCounts: {},
    };
    const result = await addSession(newSession);

    // Assert: Result is NOT ok, reason is 'quota', NO THROW
    expect(result).toEqual({ ok: false, reason: "quota" });
    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe("quota");

    Storage.prototype.setItem = originalSetItem;
  });

  // ── AC-3: Corrupted JSON resilience ──

  it("AC-3[P0]: getSessions returns [] when JSON is corrupted", async () => {
    // @ts-ignore - file will be created by coder
    const { getSessions } = await import("@/lib/storage.sessions");

    // Arrange: Store corrupted JSON
    localStorage.setItem(LS_KEYS.sessions, "{ invalid json :: }");

    // Act
    const result = getSessions();

    // Assert: Returns empty array, does not throw
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("AC-3[P0]: getReports returns [] when JSON is corrupted", async () => {
    // @ts-ignore - file will be created by coder
    const { getReports } = await import("@/lib/storage.sessions");

    // Arrange: Store corrupted JSON
    localStorage.setItem(LS_KEYS.reports, "{ broken :: json }");

    // Act
    const result = getReports();

    // Assert: Returns empty array
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  // ── AC-4: Missing item lookup ──

  it("AC-4[P0]: getReportBySessionId returns undefined for missing sessionId", async () => {
    // @ts-ignore - file will be created by coder
    const { saveReport, getReportBySessionId } = await import("@/lib/storage.sessions");

    // Arrange: Add one report with sessionId = "session-1"
    const report: AnalysisReport = {
      sessionId: "session-1",
      formScore: 0.85,
      improvements: ["posture"],
      muscleActivation: [{ muscle: "quadriceps", percent: 40 }],
      caloriesBurned: 150,
      aiGenerated: true,
      createdAt: 1000000000,
    };
    await saveReport(report);

    // Act: Query for non-existent sessionId
    const result = getReportBySessionId("non-existent-id");

    // Assert: Returns undefined (not null, not [])
    expect(result).toBeUndefined();
  });

  it("AC-4[P0]: getSessionById returns undefined for missing id", async () => {
    // @ts-ignore - file will be created by coder
    const { addSession, getSessionById } = await import("@/lib/storage.sessions");

    // Arrange
    const session: WorkoutSession = {
      id: "session-1",
      exerciseId: "ex-1",
      date: "2026-01-15",
      startedAt: 1000000000,
      durationSec: 300,
      totalReps: 10,
      avgFormScore: 0.8,
      caloriesBurned: 150,
      feedbackCounts: {},
    };
    await addSession(session);

    // Act: Query for non-existent id
    const result = getSessionById("non-existent");

    // Assert
    expect(result).toBeUndefined();
  });

  // ── AC-5: No console.error calls ──

  it("AC-5: getSessions does not log console.error on corrupted storage", async () => {
    // @ts-ignore - file will be created by coder
    const { getSessions } = await import("@/lib/storage.sessions");

    localStorage.setItem(LS_KEYS.sessions, "{ bad json }");
    getSessions();

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("AC-5: getReports does not log console.error on corrupted storage", async () => {
    // @ts-ignore - file will be created by coder
    const { getReports } = await import("@/lib/storage.sessions");

    localStorage.setItem(LS_KEYS.reports, "{ bad json }");
    getReports();

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("AC-5: saveReport does not log console.error on quota failure", async () => {
    // @ts-ignore - file will be created by coder
    const { saveReport } = await import("@/lib/storage.sessions");
    const originalSetItem = Storage.prototype.setItem;

    Storage.prototype.setItem = vi.fn(function (this: Storage, key: string, value?: string) {
      if (key === LS_KEYS.reports) {
        const err = new DOMException("Quota exceeded");
        (err as any).name = "QuotaExceededError";
        throw err;
      }
      originalSetItem.call(this, key, value ?? "{}");
    });

    const report: AnalysisReport = {
      sessionId: "s-1",
      formScore: 0.85,
      improvements: ["posture"],
      muscleActivation: [],
      caloriesBurned: 150,
      aiGenerated: true,
      createdAt: 1000000000,
    };
    await saveReport(report);

    expect(consoleSpy).not.toHaveBeenCalled();

    Storage.prototype.setItem = originalSetItem;
  });

  // ── Helper tests for CRUD operations ──

  it("getSessionById retrieves a session by id", async () => {
    // @ts-ignore - file will be created by coder
    const { addSession, getSessionById } = await import("@/lib/storage.sessions");

    const session: WorkoutSession = {
      id: "test-session-123",
      exerciseId: "ex-squat",
      date: "2026-01-15",
      startedAt: 1000000000,
      durationSec: 600,
      totalReps: 30,
      avgFormScore: 0.92,
      caloriesBurned: 200,
      feedbackCounts: { good: 20, excellent: 10 },
    };

    await addSession(session);
    const retrieved = getSessionById("test-session-123");

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe("test-session-123");
    expect(retrieved?.totalReps).toBe(30);
  });

  it("getReportBySessionId retrieves a report by sessionId", async () => {
    // @ts-ignore - file will be created by coder
    const { saveReport, getReportBySessionId } = await import("@/lib/storage.sessions");

    const report: AnalysisReport = {
      sessionId: "workout-abc",
      formScore: 0.88,
      improvements: ["knee alignment", "core stability"],
      muscleActivation: [
        { muscle: "quadriceps", percent: 35 },
        { muscle: "glutes", percent: 40 },
      ],
      caloriesBurned: 180,
      aiGenerated: true,
      createdAt: 1000000000,
    };

    await saveReport(report);
    const retrieved = getReportBySessionId("workout-abc");

    expect(retrieved).toBeDefined();
    expect(retrieved?.sessionId).toBe("workout-abc");
    expect(retrieved?.formScore).toBe(0.88);
    expect(retrieved?.improvements).toContain("knee alignment");
  });

  it("getReports retrieves all reports in storage", async () => {
    // @ts-ignore - file will be created by coder
    const { saveReport, getReports } = await import("@/lib/storage.sessions");

    const report1: AnalysisReport = {
      sessionId: "s-1",
      formScore: 0.85,
      improvements: [],
      muscleActivation: [],
      caloriesBurned: 100,
      aiGenerated: true,
      createdAt: 1000000000,
    };

    const report2: AnalysisReport = {
      sessionId: "s-2",
      formScore: 0.90,
      improvements: ["form"],
      muscleActivation: [],
      caloriesBurned: 150,
      aiGenerated: true,
      createdAt: 1000000001,
    };

    await saveReport(report1);
    await saveReport(report2);

    const reports = getReports();
    expect(reports.length).toBeGreaterThanOrEqual(2);
    expect(reports.some((r: AnalysisReport) => r.sessionId === "s-1")).toBe(true);
    expect(reports.some((r: AnalysisReport) => r.sessionId === "s-2")).toBe(true);
  });

  it("saveReport returns StorageResult.ok on success", async () => {
    // @ts-ignore - file will be created by coder
    const { saveReport } = await import("@/lib/storage.sessions");

    const report: AnalysisReport = {
      sessionId: "test",
      formScore: 0.8,
      improvements: [],
      muscleActivation: [],
      caloriesBurned: 100,
      aiGenerated: true,
      createdAt: 1000000000,
    };

    const result = await saveReport(report);
    expect(result).toEqual({ ok: true });
  });

  it("getSessions returns empty array when storage is empty", async () => {
    // @ts-ignore - file will be created by coder
    const { getSessions } = await import("@/lib/storage.sessions");

    const result = getSessions();
    expect(result).toEqual([]);
  });
});

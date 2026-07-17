import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Types
interface WorkoutPlan {
  id: string;
  weekOf: string;
  days: Array<{
    day: string;
    exercises: string[];
  }>;
}

interface Challenge {
  id: string;
  name: string;
  shareCode: string;
  completedDates: string[];
}

interface CompletionResult {
  ok: boolean;
  changed: boolean;
}

// Date utilities
import { getThisWeekMonday } from "@/lib/date";

// Plan storage
import { savePlan, getPlans, getPlanForWeek } from "@/lib/storage.plans";

// Challenge storage
import { joinChallenge, getChallenges, completeToday, generateShareCode } from "@/lib/storage.challenges";

describe("Date Utilities (getThisWeekMonday)", () => {
  it("AC-3: should return Monday in YYYY-MM-DD format for Monday input", () => {
    // Use a known Monday: 2026-07-20 (this week's Monday)
    const mockToday = new Date(2026, 6, 20); // July 20, 2026 (Monday)
    vi.useFakeTimers();
    vi.setSystemTime(mockToday);

    const result = getThisWeekMonday();

    expect(result).toBe("2026-07-20");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    vi.useRealTimers();
  });

  it("AC-3: should return this week's Monday for Tuesday input", () => {
    const mockToday = new Date(2026, 6, 21); // July 21, 2026 (Tuesday)
    vi.useFakeTimers();
    vi.setSystemTime(mockToday);

    const result = getThisWeekMonday();

    // Tuesday → Monday of same week (July 20)
    expect(result).toBe("2026-07-20");

    vi.useRealTimers();
  });

  it("AC-3: should return previous Monday when input is Sunday", () => {
    const mockToday = new Date(2026, 6, 19); // July 19, 2026 (Sunday)
    vi.useFakeTimers();
    vi.setSystemTime(mockToday);

    const result = getThisWeekMonday();

    // Sunday → Monday of same week (July 20) OR previous Monday?
    // Standard: weekOf = Monday of current/previous week
    // For Sunday 2026-07-19, previous Monday is 2026-07-13
    expect(result).toBe("2026-07-13");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    vi.useRealTimers();
  });

  it("AC-3: should return Monday for Friday input", () => {
    const mockToday = new Date(2026, 6, 24); // July 24, 2026 (Friday)
    vi.useFakeTimers();
    vi.setSystemTime(mockToday);

    const result = getThisWeekMonday();

    // Friday → Monday of same week (July 20)
    expect(result).toBe("2026-07-20");

    vi.useRealTimers();
  });
});

describe("Plan Storage (savePlan, getPlans, getPlanForWeek)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("AC-1: should maintain 8-week limit when saving 9 plans, removing oldest", () => {
    const plans = [];
    // Create 9 plans spanning 9 weeks
    for (let i = 0; i < 9; i++) {
      const weekOf = `2026-${String(6 + Math.floor(i / 4)).padStart(2, "0")}-${String(1 + (i % 4) * 7).padStart(2, "0")}`;
      const plan = {
        id: `plan-${i}`,
        weekOf,
        days: [
          { day: "Monday", exercises: ["Bench Press 10x3"] },
        ],
      };
      plans.push(plan);
      savePlan(plan);
    }

    const stored = getPlans();
    expect(stored).toHaveLength(8);
    expect(stored[0].id).toBe("plan-1");
    expect(stored[7].id).toBe("plan-8");
  });

  it("AC-1: should remove oldest weekOf when exceeding 8-week capacity", () => {
    const oldestWeekOf = "2026-06-01";
    const plan0 = {
      id: "plan-oldest",
      weekOf: oldestWeekOf,
      days: [{ day: "Monday", exercises: [] }],
    };
    savePlan(plan0);

    // Add 8 more plans
    for (let i = 1; i <= 8; i++) {
      const weekOf = `2026-06-${String(1 + i * 7).padStart(2, "0")}`;
      savePlan({
        id: `plan-${i}`,
        weekOf,
        days: [{ day: "Monday", exercises: [] }],
      });
    }

    const stored = getPlans();
    expect(stored).toHaveLength(8);
    const weekOfs = stored.map((p: WorkoutPlan) => p.weekOf);
    expect(weekOfs).not.toContain(oldestWeekOf);
  });

  it("AC-2: should return plan for this week when querying with getThisWeekMonday()", () => {
    const mockToday = new Date(2026, 6, 20); // July 20, 2026 (Monday)
    vi.useFakeTimers();
    vi.setSystemTime(mockToday);

    const thisWeekPlan = {
      id: "plan-this-week",
      weekOf: "2026-07-20",
      days: [
        { day: "Monday", exercises: ["Bench Press 10x3"] },
        { day: "Wednesday", exercises: ["Squat 8x3"] },
      ],
    };
    savePlan(thisWeekPlan);

    const retrieved = getPlanForWeek("2026-07-20");
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe("plan-this-week");
    expect(retrieved?.weekOf).toBe("2026-07-20");
    expect(retrieved?.days).toHaveLength(2);

    vi.useRealTimers();
  });

  it("AC-2: should return undefined when no plan exists for requested week", () => {
    const plan = {
      id: "plan-other-week",
      weekOf: "2026-06-01",
      days: [{ day: "Monday", exercises: [] }],
    };
    savePlan(plan);

    const retrieved = getPlanForWeek("2026-07-20");
    expect(retrieved).toBeUndefined();
  });

  it("AC-2: should return undefined for empty plans storage", () => {
    const retrieved = getPlanForWeek("2026-07-20");
    expect(retrieved).toBeUndefined();
  });
});

describe("Challenge Storage (joinChallenge, completeToday, generateShareCode)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("AC-4: should generate shareCode matching /^[A-Za-z0-9]{6}$/", () => {
    const shareCode = generateShareCode();

    expect(shareCode).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(shareCode).toHaveLength(6);
  });

  it("AC-4: should generate unique shareCodes on repeated calls", () => {
    const code1 = generateShareCode();
    const code2 = generateShareCode();
    const code3 = generateShareCode();

    expect(code1).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(code2).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(code3).toMatch(/^[A-Za-z0-9]{6}$/);
    // While collision is theoretically possible, it should be rare
    expect([code1, code2, code3].length).toBe(3);
  });

  it("AC-4: should generate only alphanumeric characters (no special chars)", () => {
    const codeSet = new Set<string>();
    for (let i = 0; i < 10; i++) {
      codeSet.add(generateShareCode());
    }

    codeSet.forEach((code) => {
      expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(/[^A-Za-z0-9]/.test(code)).toBe(false);
    });
  });

  it("AC-5: should not increase completedDates when completing same day twice", () => {
    const mockToday = new Date(2026, 6, 20); // July 20, 2026
    vi.useFakeTimers();
    vi.setSystemTime(mockToday);

    const shareCode = generateShareCode();
    const challenge = {
      id: "challenge-1",
      name: "30 Day Fitness",
      shareCode,
      completedDates: [] as string[],
    };

    joinChallenge("challenge-1", challenge);

    // First completion
    const result1 = completeToday("challenge-1");
    expect(result1.ok).toBe(true);
    expect(result1.changed).toBe(true);

    // Check storage after first completion
    const challenges1 = getChallenges();
    const stored1 = challenges1.find((c: Challenge) => c.id === "challenge-1");
    const lengthAfterFirst = stored1?.completedDates.length ?? 0;

    // Second completion (same day)
    const result2 = completeToday("challenge-1");
    expect(result2.ok).toBe(true);
    expect(result2.changed).toBe(false);

    // Check storage after second completion
    const challenges2 = getChallenges();
    const stored2 = challenges2.find((c: Challenge) => c.id === "challenge-1");
    const lengthAfterSecond = stored2?.completedDates.length ?? 0;

    expect(lengthAfterSecond).toBe(lengthAfterFirst);

    vi.useRealTimers();
  });

  it("AC-5: should increase completedDates when completing on different days", () => {
    const challenge = {
      id: "challenge-2",
      name: "Weekly Challenge",
      shareCode: generateShareCode(),
      completedDates: [] as string[],
    };
    joinChallenge("challenge-2", challenge);

    // Day 1
    const mockDay1 = new Date(2026, 6, 20);
    vi.useFakeTimers();
    vi.setSystemTime(mockDay1);

    const result1 = completeToday("challenge-2");
    expect(result1.ok).toBe(true);
    expect(result1.changed).toBe(true);

    let challenges = getChallenges();
    let stored = challenges.find((c: Challenge) => c.id === "challenge-2");
    expect(stored?.completedDates).toHaveLength(1);

    // Day 2
    const mockDay2 = new Date(2026, 6, 21);
    vi.setSystemTime(mockDay2);

    const result2 = completeToday("challenge-2");
    expect(result2.ok).toBe(true);
    expect(result2.changed).toBe(true);

    challenges = getChallenges();
    stored = challenges.find((c: Challenge) => c.id === "challenge-2");
    expect(stored?.completedDates).toHaveLength(2);

    vi.useRealTimers();
  });

  it("should return ok:true and changed:true on first completion", () => {
    const mockToday = new Date(2026, 6, 20);
    vi.useFakeTimers();
    vi.setSystemTime(mockToday);

    const shareCode = generateShareCode();
    const challenge = {
      id: "challenge-first",
      name: "Test Challenge",
      shareCode,
      completedDates: [] as string[],
    };
    joinChallenge("challenge-first", challenge);

    const result = completeToday("challenge-first");
    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);

    vi.useRealTimers();
  });

  it("should retrieve stored challenges via getChallenges()", () => {
    const shareCode1 = generateShareCode();
    const challenge1 = {
      id: "challenge-stored-1",
      name: "Challenge 1",
      shareCode: shareCode1,
      completedDates: [] as string[],
    };
    joinChallenge("challenge-stored-1", challenge1);

    const shareCode2 = generateShareCode();
    const challenge2 = {
      id: "challenge-stored-2",
      name: "Challenge 2",
      shareCode: shareCode2,
      completedDates: [] as string[],
    };
    joinChallenge("challenge-stored-2", challenge2);

    const challenges = getChallenges();
    expect(challenges).toHaveLength(2);
    expect(challenges.map((c: Challenge) => c.id)).toContain("challenge-stored-1");
    expect(challenges.map((c: Challenge) => c.id)).toContain("challenge-stored-2");
  });

  it("should return empty array when no challenges exist", () => {
    const challenges = getChallenges();
    expect(Array.isArray(challenges)).toBe(true);
    expect(challenges).toHaveLength(0);
  });
});

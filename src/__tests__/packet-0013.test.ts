import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { AppProvider } from "@/lib/AppContext";
import { LS_KEYS, saveProfile, saveFlags } from "@/lib/storage";
import { savePlan } from "@/lib/storage.plans";
import { getThisWeekMonday } from "@/lib/date";
import type { UserProfile, AppFlags, WorkoutSession } from "@/lib/types";
import Home from "@/pages/Home";

mockAll();

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "user-1",
    nickname: "테스터",
    gender: "none",
    age: 30,
    heightCm: 170,
    weightKg: 65,
    fitnessLevel: "beginner",
    goal: "health",
    weeklyTargetDays: 4,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeFlags(overrides: Partial<AppFlags> = {}): AppFlags {
  return {
    aiNoticeAcknowledged: true,
    onboardingDone: true,
    isPremium: false,
    premiumUntil: null,
    ...overrides,
  };
}

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: "session-1",
    exerciseId: "squat",
    date: "2026-07-20",
    startedAt: Date.now(),
    durationSec: 300,
    totalReps: 10,
    avgFormScore: 80,
    caloriesBurned: 50,
    feedbackCounts: {},
    ...overrides,
  };
}

function seedSessions(sessions: WorkoutSession[]) {
  localStorage.setItem(LS_KEYS.sessions, JSON.stringify(sessions));
}

function renderHome() {
  return renderWithRouter(
    React.createElement(AppProvider, null, React.createElement(Home)),
  );
}

function findRowByText(text: string): HTMLElement {
  const rows = screen.getAllByRole("listitem");
  const row = rows.find((r) => r.textContent?.includes(text));
  if (!row) throw new Error(`row containing "${text}" not found`);
  return row;
}

function navigatedTo(target: string): boolean {
  return mockNavigate.mock.calls.some((call) => String(call[0]).includes(target));
}

describe("홈 대시보드 /", () => {
  it("AC-1: 이번 주 세션이 있으면 Hero에 이번 주 운동 횟수/목표일과 평균 자세 점수가 표시된다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 20)); // 2026-07-20 (월요일)

    saveProfile(makeProfile({ weeklyTargetDays: 4 }));
    saveFlags(makeFlags());
    seedSessions([
      makeSession({ id: "s1", date: "2026-07-20", avgFormScore: 80 }),
      makeSession({ id: "s2", date: "2026-07-21", avgFormScore: 90 }),
      // 지난 주 세션 — 이번 주 집계에서 제외되어야 함
      makeSession({ id: "s0", date: "2026-07-10", avgFormScore: 10 }),
    ]);

    const { container } = renderHome();

    const text = container.textContent ?? "";
    expect(text).toMatch(/이번\s*주\s*운동/);
    expect(text).toMatch(/2\s*\/\s*4/); // 2회 완료 / 목표 4일
    expect(text).toMatch(/평균\s*자세\s*점수/);
    expect(text).toMatch(/85\s*점/); // (80+90)/2 = 85

    vi.useRealTimers();
  });

  it("AC-2: 이번 주 플랜이 없으면 EmptyState가 렌더되고 탭 시 /plan으로 이동한다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 20));
    saveFlags(makeFlags());
    seedSessions([]);
    // 플랜 저장소를 비워둔다 (getPlanForWeek === undefined)

    renderHome();

    expect(screen.getByText("아직 이번 주 플랜이 없어요")).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /플랜 만들러 가기/ });
    fireEvent.click(cta);

    expect(navigatedTo("/plan")).toBe(true);

    vi.useRealTimers();
  });

  it("AC-3: 세션이 0개면 최근 기록 영역에 EmptyState '아직 운동 기록이 없어요'가 표시된다", () => {
    saveFlags(makeFlags());
    seedSessions([]);

    renderHome();

    expect(screen.getByText("아직 운동 기록이 없어요")).toBeInTheDocument();
  });

  it("AC-4: 잠금 해제된 플랜 운동 탭 시 navigate('/workout/:id')로 이동한다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 20));

    saveFlags(makeFlags({ isPremium: false }));
    seedSessions([]);
    savePlan({
      id: "plan-week1",
      weekOf: getThisWeekMonday(),
      days: [{ day: "Monday", exercises: ["squat"] }],
    });

    renderHome();

    const squatRow = findRowByText("스쿼트"); // isFree: true
    fireEvent.click(squatRow);

    expect(navigatedTo("/workout/squat")).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("AC-4: 잠금 운동(isFree=false) & 비프리미엄이면 탭 시 프리미엄 BottomSheet가 열리고 navigate는 호출되지 않는다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 20));

    saveFlags(makeFlags({ isPremium: false }));
    seedSessions([]);
    savePlan({
      id: "plan-week1",
      weekOf: getThisWeekMonday(),
      days: [{ day: "Monday", exercises: ["lunge"] }], // isFree: false
    });

    renderHome();

    const lungeRow = findRowByText("런지");
    fireEvent.click(lungeRow);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(navigatedTo("/workout/lunge")).toBe(false);

    vi.useRealTimers();
  });

  it("최근 기록 탭 시 navigate('/report/:sessionId')로 이동한다", () => {
    saveFlags(makeFlags());
    seedSessions([makeSession({ id: "session-report-1", exerciseId: "plank", date: "2026-07-15" })]);

    renderHome();

    const recordRow = findRowByText("플랭크");
    fireEvent.click(recordRow);

    expect(navigatedTo("/report/session-report-1")).toBe(true);
  });

  it("AC-5: localStorage 데이터가 손상되어도 에러 없이 Empty 상태로 폴백된다", () => {
    localStorage.setItem(LS_KEYS.sessions, "{not-valid-json");
    localStorage.setItem(LS_KEYS.plans, "not-json-at-all[[[");
    localStorage.setItem(LS_KEYS.profile, "]]]broken");

    expect(() => renderHome()).not.toThrow();

    expect(screen.getByText("아직 운동 기록이 없어요")).toBeInTheDocument();
    expect(screen.getByText("아직 이번 주 플랜이 없어요")).toBeInTheDocument();
  });
});

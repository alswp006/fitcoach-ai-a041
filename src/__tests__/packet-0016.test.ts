import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { AppProvider } from "@/lib/AppContext";
import { LS_KEYS, saveProfile, saveFlags } from "@/lib/storage";
import { getReportBySessionId } from "@/lib/storage.sessions";
import type { UserProfile, AppFlags, WorkoutSession, AnalysisReport } from "@/lib/types";
import Report from "@/pages/Report";

mockAll();

// postReport is a network call — mock it directly (real shape verified in src/lib/api.ts).
vi.mock("@/lib/api", () => ({
  postReport: vi.fn(),
}));
import { postReport } from "@/lib/api";
const mockPostReport = vi.mocked(postReport);

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "u1",
    nickname: "테스터",
    gender: "none",
    age: 30,
    heightCm: 170,
    weightKg: 70,
    fitnessLevel: "beginner",
    goal: "health",
    weeklyTargetDays: 3,
    createdAt: 1000,
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
    id: "s1",
    exerciseId: "squat",
    date: "2026-07-15",
    startedAt: 1700000000000,
    durationSec: 300,
    totalReps: 20,
    avgFormScore: 82,
    caloriesBurned: 120,
    feedbackCounts: { knee_low: 2 },
    ...overrides,
  };
}

function renderReport(sessionId: string) {
  return renderWithRouter(
    React.createElement(
      AppProvider,
      null,
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: "/report/:sessionId",
          element: React.createElement(Report),
        }),
      ),
    ),
    { initialEntries: [`/report/${sessionId}`] },
  );
}

describe("AI 리포트 페이지 /report/:sessionId", () => {
  beforeEach(() => {
    localStorage.clear();
    saveFlags(makeFlags());
    saveProfile(makeProfile());
  });

  it("AC-1[P0]: 세션 존재 시 postReport 응답이 저장되고 폼점수/개선점/근육활성도/칼로리가 렌더된다", async () => {
    seedLocalStorage({ [LS_KEYS.sessions]: [makeSession()] });
    mockPostReport.mockResolvedValueOnce({
      ok: true,
      data: {
        formScore: 88,
        improvements: ["무릎을 더 깊이 굽혀보세요", "속도를 일정하게 유지하세요"],
        muscleActivation: [
          { muscle: "대퇴사두근", percent: 70 },
          { muscle: "둔근", percent: 55 },
        ],
        caloriesBurned: 245,
      },
    });

    renderReport("s1");

    expect(await screen.findByText("88")).toBeInTheDocument();
    expect(screen.getByText("무릎을 더 깊이 굽혀보세요")).toBeInTheDocument();
    expect(screen.getByText("속도를 일정하게 유지하세요")).toBeInTheDocument();
    expect(screen.getByText("245")).toBeInTheDocument();
    expect(screen.getAllByTestId("muscle-bar")).toHaveLength(2);

    await waitFor(() => {
      expect(getReportBySessionId("s1")).not.toBeUndefined();
    });
    const saved = getReportBySessionId("s1") as AnalysisReport;
    expect(saved.formScore).toBe(88);
    expect(saved.caloriesBurned).toBe(245);
    expect(saved.improvements).toHaveLength(2);
    expect(saved.aiGenerated).toBe(true);
  });

  it("AC-1[P0]: postReport에 세션·프로필 데이터로 만든 ReportRequest가 전달된다", async () => {
    seedLocalStorage({
      [LS_KEYS.sessions]: [
        makeSession({
          id: "s2",
          exerciseId: "lunge",
          totalReps: 15,
          durationSec: 200,
          avgFormScore: 75,
          feedbackCounts: { hip_low: 1 },
        }),
      ],
    });
    mockPostReport.mockResolvedValueOnce({
      ok: true,
      data: { formScore: 70, improvements: [], muscleActivation: [], caloriesBurned: 100 },
    });

    renderReport("s2");

    await waitFor(() => expect(mockPostReport).toHaveBeenCalledTimes(1));
    expect(mockPostReport).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: "lunge",
        totalReps: 15,
        durationSec: 200,
        avgFormScore: 75,
        feedbackCounts: { hip_low: 1 },
        weightKg: 70,
      }),
    );
  });

  it("AC-2[P0]: 결과 영역 최상단(report-hero)에 'AI가 생성한 결과입니다' 배지가 표시된다", async () => {
    seedLocalStorage({ [LS_KEYS.sessions]: [makeSession()] });
    mockPostReport.mockResolvedValueOnce({
      ok: true,
      data: { formScore: 90, improvements: [], muscleActivation: [], caloriesBurned: 50 },
    });

    renderReport("s1");

    const hero = await screen.findByTestId("report-hero");
    expect(within(hero).getByText("AI가 생성한 결과입니다")).toBeInTheDocument();
    expect(within(hero).getByText("90")).toBeInTheDocument();
  });

  it("AC-3: getReportBySessionId에 캐시가 있으면 postReport 재호출 없이 즉시 표시한다", async () => {
    const cached: AnalysisReport = {
      sessionId: "s3",
      formScore: 77,
      improvements: ["보폭을 넓혀보세요"],
      muscleActivation: [{ muscle: "둔근", percent: 60 }],
      caloriesBurned: 300,
      aiGenerated: true,
      createdAt: 1700000000000,
    };
    seedLocalStorage({
      [LS_KEYS.sessions]: [makeSession({ id: "s3" })],
      [LS_KEYS.reports]: [cached],
    });

    renderReport("s3");

    expect(await screen.findByText("77")).toBeInTheDocument();
    expect(screen.getByText("보폭을 넓혀보세요")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(mockPostReport).not.toHaveBeenCalled();
  });

  it("AC-4: postReport가 {ok:false}를 반환하면 에러 문구 + '다시 시도' 버튼이 표시되고 크래시하지 않는다", async () => {
    seedLocalStorage({ [LS_KEYS.sessions]: [makeSession({ id: "s4" })] });
    mockPostReport.mockResolvedValueOnce({
      ok: false,
      error: "리포트 생성에 실패했어요. 다시 시도해주세요",
    });

    renderReport("s4");

    expect(await screen.findByText("리포트 생성에 실패했어요. 다시 시도해주세요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(getReportBySessionId("s4")).toBeUndefined();
  });

  it("AC-5: 존재하지 않는 sessionId 접근 시 '기록을 찾을 수 없어요' + 홈 이동 버튼이 표시된다", async () => {
    renderReport("does-not-exist");

    expect(await screen.findByText(/기록을 찾을 수 없어요/)).toBeInTheDocument();
    const homeButton = screen.getByRole("button", { name: /홈/ });

    fireEvent.click(homeButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(mockPostReport).not.toHaveBeenCalled();
  });
});

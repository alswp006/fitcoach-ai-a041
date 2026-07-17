import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { AppProvider } from "@/lib/AppContext";
import { saveFlags, saveProfile } from "@/lib/storage";
import type { AppFlags, UserProfile } from "@/lib/types";
import Workout from "@/pages/Workout";

mockAll();

// usePose/useCamera는 이 패킷이 소유하지 않는 별도 훅(0010/0011)이라 완전히 모킹해
// Workout.tsx 자체의 로직(게이팅/렌더링/세션 저장/언마운트 정리)만 격리해 검증한다.
const { mockUseCamera, mockUsePose, mockAddSession, mockTrackStop, mockCancelRaf } =
  vi.hoisted(() => ({
    mockUseCamera: vi.fn(),
    mockUsePose: vi.fn(),
    mockAddSession: vi.fn(async (_session?: any) => ({ ok: true })),
    mockTrackStop: vi.fn(),
    mockCancelRaf: vi.fn(),
  }));

vi.mock("@/hooks/useCamera", () => ({
  useCamera: mockUseCamera,
}));

vi.mock("@/hooks/usePose", () => ({
  usePose: mockUsePose,
  calculateAngle: vi.fn(),
}));

vi.mock("@/lib/storage.sessions", () => ({
  addSession: mockAddSession,
}));

function makeFlags(overrides: Partial<AppFlags> = {}): AppFlags {
  return {
    aiNoticeAcknowledged: true,
    onboardingDone: true,
    isPremium: false,
    premiumUntil: null,
    ...overrides,
  };
}

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

function workoutTree(exerciseId: string) {
  return React.createElement(
    AppProvider,
    null,
    React.createElement(
      Routes,
      null,
      React.createElement(Route, {
        path: "/workout/:exerciseId",
        element: React.createElement(Workout),
      }),
    ),
  );
}

function renderWorkout(exerciseId: string) {
  return renderWithRouter(workoutTree(exerciseId), {
    initialEntries: [`/workout/${exerciseId}`],
  });
}

describe("운동 세션 페이지 /workout/:exerciseId", () => {
  beforeEach(() => {
    localStorage.clear();
    saveFlags(makeFlags());
    saveProfile(makeProfile());

    mockAddSession.mockClear();
    mockAddSession.mockResolvedValue({ ok: true });

    mockUseCamera.mockReset();
    mockUseCamera.mockImplementation(() => {
      React.useEffect(() => {
        return () => {
          mockTrackStop();
        };
      }, []);
      return {
        state: "ready",
        stream: { getTracks: () => [{ stop: mockTrackStop }] },
        error: null,
      };
    });

    mockUsePose.mockReset();
    mockUsePose.mockImplementation(() => {
      React.useEffect(() => {
        return () => {
          mockCancelRaf();
        };
      }, []);
      return {
        reps: 0,
        formScore: 0,
        currentFeedback: "",
        feedbackCounts: {},
        state: "ready",
      };
    });
  });

  it("AC-1[P0]: 카메라 ready 상태에서 프리뷰가 렌더되고 렙 카운트/자세 점수가 실시간 갱신된다", () => {
    mockUsePose.mockReturnValue({
      reps: 5,
      formScore: 88,
      currentFeedback: "무릎을 더 굽히세요",
      feedbackCounts: { knee_low: 2 },
      state: "ready",
    });

    const { rerender } = renderWorkout("squat");

    expect(screen.getByTestId("camera-preview")).toBeInTheDocument();
    expect(screen.getByTestId("rep-count")).toHaveTextContent("5");
    expect(screen.getByTestId("form-score")).toHaveTextContent("88");
    expect(screen.getByText("무릎을 더 굽히세요")).toBeInTheDocument();

    mockUsePose.mockReturnValue({
      reps: 9,
      formScore: 95,
      currentFeedback: "",
      feedbackCounts: { knee_low: 2 },
      state: "ready",
    });

    rerender(workoutTree("squat"));

    expect(screen.getByTestId("rep-count")).toHaveTextContent("9");
    expect(screen.getByTestId("form-score")).toHaveTextContent("95");
  });

  it("AC-2[P0]: 카메라 상태 'denied'면 안내 문구 + '다시 시도' 버튼이 표시되고 크래시하지 않는다", () => {
    mockUseCamera.mockReturnValue({ state: "denied", stream: null, error: null });

    expect(() => renderWorkout("squat")).not.toThrow();

    expect(screen.getByText(/카메라/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(screen.queryByTestId("camera-preview")).not.toBeInTheDocument();
  });

  it("AC-3[P0]: isFree===false 운동에 비프리미엄 접근 시 프리미엄 BottomSheet가 열리고 getUserMedia가 호출되지 않는다", () => {
    const getUserMediaSpy = vi.fn();
    const originalMediaDevices = global.navigator.mediaDevices;
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: getUserMediaSpy },
      writable: true,
      configurable: true,
    });

    saveFlags(makeFlags({ isPremium: false }));

    renderWorkout("lunge");

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/프리미엄/)).toBeInTheDocument();
    expect(mockUseCamera).not.toHaveBeenCalled();
    expect(getUserMediaSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("camera-preview")).not.toBeInTheDocument();

    Object.defineProperty(global.navigator, "mediaDevices", {
      value: originalMediaDevices,
      writable: true,
      configurable: true,
    });
  });

  it("AC-4[P0]: '운동 끝내기' 탭 시 WorkoutSession이 addSession으로 저장되고 /report/:sessionId로 이동한다", async () => {
    mockUsePose.mockReturnValue({
      reps: 12,
      formScore: 91,
      currentFeedback: "",
      feedbackCounts: { knee_low: 3, hip_high: 1 },
      state: "ready",
    });

    renderWorkout("squat");

    const finishButton = screen.getByRole("button", { name: "운동 끝내기" });
    fireEvent.click(finishButton);

    await waitFor(() => expect(mockAddSession).toHaveBeenCalledTimes(1));

    const saved = mockAddSession.mock.calls[0][0];
    expect(saved.exerciseId).toBe("squat");
    expect(saved.totalReps).toBe(12);
    expect(saved.avgFormScore).toBe(91);
    expect(saved.feedbackCounts).toEqual({ knee_low: 3, hip_high: 1 });
    expect(typeof saved.durationSec).toBe("number");
    expect(saved.durationSec).toBeGreaterThanOrEqual(0);
    expect(typeof saved.caloriesBurned).toBe("number");
    expect(saved.caloriesBurned).toBeGreaterThanOrEqual(0);
    expect(typeof saved.id).toBe("string");
    expect(saved.id.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/report/${saved.id}`);
    });
  });

  it("AC-5[P0]: 언마운트 시 video track stop, rAF cancel, speechSynthesis.cancel이 모두 호출된다", () => {
    const cancelSpy = vi.fn();
    const originalSpeechSynthesis = global.speechSynthesis;
    Object.defineProperty(global, "speechSynthesis", {
      value: {
        cancel: cancelSpy,
        speak: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        pending: false,
        paused: false,
        speaking: false,
      },
      writable: true,
      configurable: true,
    });

    const { unmount } = renderWorkout("squat");

    unmount();

    expect(mockTrackStop).toHaveBeenCalledTimes(1);
    expect(mockCancelRaf).toHaveBeenCalledTimes(1);
    expect(cancelSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(global, "speechSynthesis", {
      value: originalSpeechSynthesis,
      writable: true,
      configurable: true,
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { saveFlags } from "@/lib/storage";
import type { AppFlags } from "@/lib/types";
import App from "@/App";

// NOTE: this packet tests real routing/redirect/active-tab behavior, so unlike most
// packet tests we do NOT mock react-router-dom's useNavigate/useLocation (mockRouter()/
// mockAll() would pin useLocation to a fixed "/" and make AC-2/AC-3/AC-5 unobservable).
// We keep the real MemoryRouter + real useLocation/useNavigate/Navigate, and only mock
// TDS (crashes in jsdom), the SDK, and the reward-ad gate.
mockTds();
mockAppsInToss();
mockTossRewardAd();

function makeFlags(overrides: Partial<AppFlags> = {}): AppFlags {
  return {
    aiNoticeAcknowledged: true,
    onboardingDone: true,
    isPremium: false,
    premiumUntil: null,
    ...overrides,
  };
}

function renderApp(initialEntries: string[]) {
  return render(
    React.createElement(MemoryRouter, { initialEntries }, React.createElement(App)),
  );
}

describe("라우팅 배선 + 온보딩 가드 + FloatingTabBar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("AC-1[P0]: 7개 라우트가 모두 정의되고 각 경로 직접 접근 시 해당 페이지가 렌더된다", () => {
    beforeEach(() => {
      saveFlags(makeFlags());
    });

    it("/ → Home (닉네임 헤딩)", () => {
      renderApp(["/"]);
      expect(screen.getByText("회원님, 오늘도 해봐요")).toBeInTheDocument();
    });

    it("/onboarding → Onboarding", () => {
      renderApp(["/onboarding"]);
      expect(screen.getByText("나에게 맞는 코치를 만들어요")).toBeInTheDocument();
    });

    it("/plan → Plan", () => {
      renderApp(["/plan"]);
      expect(screen.getByText("이번 주 AI 플랜")).toBeInTheDocument();
    });

    it("/workout/:exerciseId → Workout", () => {
      renderApp(["/workout/does-not-exist"]);
      expect(screen.getByText("운동")).toBeInTheDocument();
      expect(screen.getByText("운동을 찾을 수 없어요")).toBeInTheDocument();
    });

    it("/report/:sessionId → Report", () => {
      renderApp(["/report/does-not-exist"]);
      expect(screen.getByText("AI 운동 리포트")).toBeInTheDocument();
      expect(screen.getByText("기록을 찾을 수 없어요")).toBeInTheDocument();
    });

    it("/challenges → Challenges", () => {
      renderApp(["/challenges"]);
      expect(screen.getByText("챌린지")).toBeInTheDocument();
    });

    it("/premium → Premium", () => {
      renderApp(["/premium"]);
      expect(screen.getByText("FitCoach 프리미엄")).toBeInTheDocument();
    });
  });

  describe("AC-2[P0]: flags.onboardingDone===false 상태로 / 접근 시 /onboarding으로 replace 리다이렉트된다", () => {
    it("onboardingDone=false → / 접근 시 온보딩 화면이 렌더된다", () => {
      saveFlags(makeFlags({ onboardingDone: false }));
      renderApp(["/"]);

      expect(screen.getByText("나에게 맞는 코치를 만들어요")).toBeInTheDocument();
      expect(screen.queryByText("회원님, 오늘도 해봐요")).not.toBeInTheDocument();
    });

    it("onboardingDone=false → /plan 접근도 온보딩 화면으로 가드된다", () => {
      saveFlags(makeFlags({ onboardingDone: false }));
      renderApp(["/plan"]);

      expect(screen.getByText("나에게 맞는 코치를 만들어요")).toBeInTheDocument();
      expect(screen.queryByText("이번 주 AI 플랜")).not.toBeInTheDocument();
    });

    it("onboardingDone=true면 가드 없이 / 접근 시 Home이 렌더된다", () => {
      saveFlags(makeFlags({ onboardingDone: true }));
      renderApp(["/"]);

      expect(screen.getByText("회원님, 오늘도 해봐요")).toBeInTheDocument();
    });
  });

  describe("AC-3[P0]: /, /plan, /challenges에서만 FloatingTabBar(홈·플랜·챌린지 3탭)가 렌더되고 활성 탭이 컬러 틴트로 표시된다", () => {
    beforeEach(() => {
      saveFlags(makeFlags());
    });

    it("/ 에서 탭바 3탭이 렌더되고 '홈' 탭이 active(aria-selected=true)다", () => {
      renderApp(["/"]);

      const tablist = screen.getByRole("tablist");
      expect(tablist).toBeInTheDocument();
      const tabs = screen.getAllByRole("tab");
      expect(tabs.map((t) => t.getAttribute("aria-label"))).toEqual(
        expect.arrayContaining(["홈", "플랜", "챌린지"]),
      );
      expect(tabs).toHaveLength(3);

      const activeTabs = tabs.filter((t) => t.getAttribute("aria-selected") === "true");
      expect(activeTabs).toHaveLength(1);
      expect(activeTabs[0].getAttribute("aria-label")).toBe("홈");
    });

    it("/plan 에서 '플랜' 탭이 active다", () => {
      renderApp(["/plan"]);

      const tabs = screen.getAllByRole("tab");
      const activeTabs = tabs.filter((t) => t.getAttribute("aria-selected") === "true");
      expect(activeTabs).toHaveLength(1);
      expect(activeTabs[0].getAttribute("aria-label")).toBe("플랜");
    });

    it("/challenges 에서 '챌린지' 탭이 active다", () => {
      renderApp(["/challenges"]);

      const tabs = screen.getAllByRole("tab");
      const activeTabs = tabs.filter((t) => t.getAttribute("aria-selected") === "true");
      expect(activeTabs).toHaveLength(1);
      expect(activeTabs[0].getAttribute("aria-label")).toBe("챌린지");
    });
  });

  describe("AC-4[P0]: /workout/*, /report/*, /onboarding, /premium에서는 FloatingTabBar가 렌더되지 않는다", () => {
    beforeEach(() => {
      saveFlags(makeFlags());
    });

    it("/workout/:exerciseId 에는 탭바가 없다", () => {
      renderApp(["/workout/does-not-exist"]);
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });

    it("/report/:sessionId 에는 탭바가 없다", () => {
      renderApp(["/report/does-not-exist"]);
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });

    it("/onboarding 에는 탭바가 없다", () => {
      renderApp(["/onboarding"]);
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });

    it("/premium 에는 탭바가 없다", () => {
      renderApp(["/premium"]);
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });
  });

  describe("AC-5: 정의되지 않은 경로 접근 시 /로 리다이렉트되고 흰 화면이 발생하지 않는다", () => {
    it("존재하지 않는 경로는 홈으로 리다이렉트된다 (onboardingDone=true)", () => {
      saveFlags(makeFlags());
      const { container } = renderApp(["/this-route-does-not-exist"]);

      expect(container.textContent).not.toBe("");
      expect(screen.getByText("회원님, 오늘도 해봐요")).toBeInTheDocument();
    });

    it("존재하지 않는 경로 + onboardingDone=false는 온보딩으로 가드된다 (크래시 없음)", () => {
      saveFlags(makeFlags({ onboardingDone: false }));
      const { container } = renderApp(["/this-route-does-not-exist"]);

      expect(container.textContent).not.toBe("");
      expect(screen.getByText("나에게 맞는 코치를 만들어요")).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, renderHook, act } from "@testing-library/react";
import { LS_KEYS } from "@/lib/storage";
import type { AppFlags, UserProfile } from "@/lib/types";
import { AppProvider, useApp } from "@/lib/AppContext";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "u1",
    nickname: "테스터",
    gender: "none",
    age: 30,
    heightCm: 170,
    weightKg: 65,
    fitnessLevel: "beginner",
    goal: "health",
    weeklyTargetDays: 3,
    createdAt: 1000,
    ...overrides,
  };
}

function makeFlags(overrides: Partial<AppFlags> = {}): AppFlags {
  return {
    aiNoticeAcknowledged: false,
    onboardingDone: false,
    isPremium: false,
    premiumUntil: null,
    ...overrides,
  };
}

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AppProvider, null, children);

describe("AppContext (플래그·프로필·프리미엄 만료 검사)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1[P0]: premiumUntil이 과거면 마운트 시 isPremium=false로 갱신되고 localStorage에도 반영된다", () => {
    const pastFlags = makeFlags({ isPremium: true, premiumUntil: Date.now() - 1000 * 60 * 60 });
    localStorage.setItem(LS_KEYS.flags, JSON.stringify(pastFlags));

    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.flags.isPremium).toBe(false);
    expect(result.current.isPremium).toBe(false);

    const stored = JSON.parse(localStorage.getItem(LS_KEYS.flags)!) as AppFlags;
    expect(stored.isPremium).toBe(false);
  });

  it("AC-1[P0]: premiumUntil이 미래면 isPremium=true가 유지된다", () => {
    const futureFlags = makeFlags({ isPremium: true, premiumUntil: Date.now() + 1000 * 60 * 60 });
    localStorage.setItem(LS_KEYS.flags, JSON.stringify(futureFlags));

    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.flags.isPremium).toBe(true);
    expect(result.current.isPremium).toBe(true);
  });

  it("AC-2: useApp().isPremium이 여러 하위 컴포넌트에서 동일한 값을 참조한다(단일 소스)", () => {
    localStorage.setItem(
      LS_KEYS.flags,
      JSON.stringify(makeFlags({ isPremium: true, premiumUntil: Date.now() + 100000 })),
    );

    function ChildA() {
      const { isPremium } = useApp();
      return React.createElement("span", { "data-testid": "child-a" }, String(isPremium));
    }
    function ChildB() {
      const { isPremium } = useApp();
      return React.createElement("span", { "data-testid": "child-b" }, String(isPremium));
    }

    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(ChildA),
        React.createElement(ChildB),
      ),
    );

    expect(screen.getByTestId("child-a").textContent).toBe("true");
    expect(screen.getByTestId("child-b").textContent).toBe("true");
    expect(screen.getByTestId("child-a").textContent).toBe(screen.getByTestId("child-b").textContent);
  });

  it("AC-3: acknowledgeAiNotice() 호출 시 flags.aiNoticeAcknowledged=true가 저장되고 재렌더된다", () => {
    localStorage.setItem(LS_KEYS.flags, JSON.stringify(makeFlags({ aiNoticeAcknowledged: false })));

    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.flags.aiNoticeAcknowledged).toBe(false);

    act(() => {
      result.current.acknowledgeAiNotice();
    });

    expect(result.current.flags.aiNoticeAcknowledged).toBe(true);
    const stored = JSON.parse(localStorage.getItem(LS_KEYS.flags)!) as AppFlags;
    expect(stored.aiNoticeAcknowledged).toBe(true);
  });

  it("AC-4[P0]: Provider 밖에서 useApp() 호출 시 명확한 에러를 throw한다", () => {
    function Bare() {
      useApp();
      return null;
    }
    expect(() => render(React.createElement(Bare))).toThrow(/AppProvider/);
  });

  it("setPremium(untilTs)는 flags.isPremium=true와 premiumUntil을 갱신하고 저장한다", () => {
    localStorage.setItem(LS_KEYS.flags, JSON.stringify(makeFlags()));

    const { result } = renderHook(() => useApp(), { wrapper });
    const until = Date.now() + 1000 * 60 * 60 * 24 * 30;

    act(() => {
      result.current.setPremium(until);
    });

    expect(result.current.flags.isPremium).toBe(true);
    expect(result.current.flags.premiumUntil).toBe(until);

    const stored = JSON.parse(localStorage.getItem(LS_KEYS.flags)!) as AppFlags;
    expect(stored.isPremium).toBe(true);
    expect(stored.premiumUntil).toBe(until);
  });

  it("refreshProfile()는 storage에서 프로필을 다시 읽어 상태에 반영한다", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.profile).toBeNull();

    const profile = makeProfile({ nickname: "새프로필" });
    localStorage.setItem(LS_KEYS.profile, JSON.stringify(profile));

    act(() => {
      result.current.refreshProfile();
    });

    expect(result.current.profile?.nickname).toBe("새프로필");
    expect(result.current.profile?.id).toBe("u1");
  });
});

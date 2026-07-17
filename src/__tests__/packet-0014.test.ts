import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { AppProvider } from "@/lib/AppContext";
import { LS_KEYS, saveProfile, saveFlags } from "@/lib/storage";
import { getPlanForWeek } from "@/lib/storage.plans";
import { getThisWeekMonday } from "@/lib/date";
import type { UserProfile, AppFlags } from "@/lib/types";

mockTds();
mockAppsInToss();
mockRouter();

// TossRewardAd's real prop is `onRewarded` (verified in src/components/TossRewardAd.tsx).
// The shared mockTossRewardAd() helper fires a differently-named `onReward` prop, so it
// would never unlock this page's flow — mock it locally with the correct prop name.
// Mirrors the real component's dev-environment fallback: auto-unlocks async and renders
// children immediately (ad is considered "always watched" in tests).
vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: ({ children, onRewarded }: any) => {
    if (onRewarded) setTimeout(onRewarded, 0);
    return children;
  },
}));

vi.mock("@/lib/api", () => ({ postPlan: vi.fn() }));
import { postPlan } from "@/lib/api";
import Plan from "@/pages/Plan";

const mockPostPlan = vi.mocked(postPlan);

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "user-1",
    nickname: "테스터",
    gender: "male",
    age: 28,
    heightCm: 175,
    weightKg: 78,
    fitnessLevel: "intermediate",
    goal: "muscle",
    weeklyTargetDays: 4,
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

function renderPlan() {
  return renderWithRouter(
    React.createElement(AppProvider, null, React.createElement(Plan)),
  );
}

describe("개인화 플랜 페이지 /plan", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1: 무료 유저가 '플랜 만들기' 탭 시 postPlan은 광고 시청 완료 후에만 호출되고, 응답이 저장 + 카드/AI 요약으로 렌더된다", async () => {
    saveProfile(makeProfile());
    saveFlags(makeFlags({ isPremium: false }));
    mockPostPlan.mockResolvedValueOnce({
      ok: true,
      data: { exerciseIds: ["squat", "pushup"], summary: "이번주는 하체와 코어를 중심으로 구성했어요" },
    });

    renderPlan();

    const cta = screen.getByRole("button", { name: "플랜 만들기" });
    fireEvent.click(cta);

    // 광고 시청이 끝나기 전(동기적으로)에는 아직 호출되지 않는다
    expect(mockPostPlan).not.toHaveBeenCalled();

    await waitFor(() => expect(mockPostPlan).toHaveBeenCalledTimes(1));
    expect(mockPostPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        gender: "male",
        age: 28,
        heightCm: 175,
        weightKg: 78,
        fitnessLevel: "intermediate",
        goal: "muscle",
        weeklyTargetDays: 4,
      }),
    );

    expect(await screen.findByText("이번주는 하체와 코어를 중심으로 구성했어요")).toBeInTheDocument();
    expect(screen.getAllByTestId("plan-exercise-card")).toHaveLength(2);
    expect(screen.getByText("스쿼트")).toBeInTheDocument();
    expect(screen.getByText("푸시업")).toBeInTheDocument();

    const saved = getPlanForWeek(getThisWeekMonday());
    expect(saved).toBeDefined();
    const raw = localStorage.getItem(LS_KEYS.plans) ?? "";
    expect(raw).toContain("squat");
    expect(raw).toContain("pushup");
  });

  it("AC-2: 결과 영역 최상단에 'AI가 생성한 결과입니다' 배지가 렌더된다", async () => {
    saveProfile(makeProfile());
    saveFlags(makeFlags({ isPremium: true }));
    mockPostPlan.mockResolvedValueOnce({
      ok: true,
      data: { exerciseIds: ["squat"], summary: "가벼운 하체 운동으로 시작해요" },
    });

    renderPlan();
    fireEvent.click(screen.getByRole("button", { name: "플랜 만들기" }));

    const hero = await screen.findByTestId("plan-hero");
    expect(within(hero).getByText("AI가 생성한 결과입니다")).toBeInTheDocument();
  });

  it("AC-3: flags.isPremium===true면 광고 없이 즉시 postPlan이 호출된다", async () => {
    saveProfile(makeProfile());
    saveFlags(makeFlags({ isPremium: true }));
    mockPostPlan.mockResolvedValueOnce({
      ok: true,
      data: { exerciseIds: ["squat"], summary: "가벼운 하체 운동으로 시작해요" },
    });

    renderPlan();
    fireEvent.click(screen.getByRole("button", { name: "플랜 만들기" }));

    // 프리미엄은 광고 시청 대기 없이 곧바로(동기적으로) 호출된다
    expect(mockPostPlan).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/광고/)).not.toBeInTheDocument();

    expect(await screen.findByText("가벼운 하체 운동으로 시작해요")).toBeInTheDocument();
  });

  it("AC-4: API 응답 대기 중 로딩 인디케이터와 '플랜을 만드는 중...'이 표시되고 버튼이 disabled 된다", async () => {
    saveProfile(makeProfile());
    saveFlags(makeFlags({ isPremium: true }));
    mockPostPlan.mockReturnValueOnce(new Promise(() => {})); // never resolves

    renderPlan();
    const cta = screen.getByRole("button", { name: "플랜 만들기" });
    fireEvent.click(cta);

    await waitFor(() => expect(screen.getByText("플랜을 만드는 중...")).toBeInTheDocument());
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(cta).toBeDisabled();
  });

  it("AC-5: postPlan이 {ok:false}를 반환하면 에러 문구 + '다시 시도' 버튼이 렌더되고 앱이 크래시하지 않는다", async () => {
    saveProfile(makeProfile());
    saveFlags(makeFlags({ isPremium: true }));
    mockPostPlan.mockResolvedValueOnce({
      ok: false,
      error: "플랜 생성에 실패했어요. 다시 시도해주세요",
    });

    renderPlan();
    expect(() => fireEvent.click(screen.getByRole("button", { name: "플랜 만들기" }))).not.toThrow();

    expect(await screen.findByText("플랜 생성에 실패했어요. 다시 시도해주세요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(getPlanForWeek(getThisWeekMonday())).toBeUndefined();
  });
});

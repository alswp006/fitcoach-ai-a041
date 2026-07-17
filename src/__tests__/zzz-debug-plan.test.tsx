import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { AppProvider } from "@/lib/AppContext";
import { saveProfile, saveFlags } from "@/lib/storage";

mockTds();
mockAppsInToss();
mockRouter();

vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: ({ children, onRewarded }: any) => {
    console.log("TossRewardAd rendered, onRewarded=", !!onRewarded);
    if (onRewarded) {
      setTimeout(() => {
        console.log("firing onRewarded");
        onRewarded();
      }, 0);
    }
    return children;
  },
}));

vi.mock("@/lib/api", () => ({ postPlan: vi.fn() }));
import { postPlan } from "@/lib/api";
import Plan from "@/pages/Plan";

const mockPostPlan = vi.mocked(postPlan);

function makeProfile() {
  return {
    id: "user-1",
    nickname: "테스터",
    gender: "male" as const,
    age: 28,
    heightCm: 175,
    weightKg: 78,
    fitnessLevel: "intermediate" as const,
    goal: "muscle" as const,
    weeklyTargetDays: 4,
    createdAt: 1000,
  };
}
function makeFlags() {
  return { aiNoticeAcknowledged: true, onboardingDone: true, isPremium: false, premiumUntil: null };
}

describe("debug", () => {
  it("debug click flow", async () => {
    saveProfile(makeProfile());
    saveFlags(makeFlags());
    mockPostPlan.mockResolvedValueOnce({ ok: true, data: { exerciseIds: ["squat"], summary: "s" } });

    renderWithRouter(React.createElement(AppProvider, null, React.createElement(Plan)));

    const cta = screen.getByRole("button", { name: "플랜 만들기" });
    console.log("clicking");
    fireEvent.click(cta);
    console.log("clicked, waiting");

    await waitFor(() => expect(mockPostPlan).toHaveBeenCalledTimes(1), { timeout: 1000 }).catch((e) => {
      console.log("waitFor failed:", e.message);
    });
    console.log("postPlan calls:", mockPostPlan.mock.calls.length);
  });
});

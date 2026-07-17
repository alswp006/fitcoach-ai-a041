import { describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { LS_KEYS, getProfile, getFlags } from "@/lib/storage";
import type { UserProfile, AppFlags } from "@/lib/types";
import Onboarding from "@/pages/Onboarding";

mockAll();

// Contract used by these tests (Coder must implement to match):
// - TDS TextField per field, label text + placeholder = example value from spec AC-2
//   닉네임 placeholder="지훈", 나이 placeholder="30", 키 placeholder="175",
//   몸무게 placeholder="72", 주간 목표일 placeholder="3"
// - TDS Chip for 성별(남성/여성/선택 안함), 체력 수준(초급/중급/고급),
//   목표(다이어트/근력/건강/유연성)
// - Submit is a single SubmitFooter labeled "프로필 저장"
function fillValidForm(overrides: {
  nickname?: string;
  age?: string;
  heightCm?: string;
  weightKg?: string;
  weeklyTargetDays?: string;
} = {}) {
  const nickname = overrides.nickname ?? "지훈";
  const age = overrides.age ?? "30";
  const heightCm = overrides.heightCm ?? "175";
  const weightKg = overrides.weightKg ?? "72";
  const weeklyTargetDays = overrides.weeklyTargetDays ?? "3";

  if (nickname !== "") {
    fireEvent.change(screen.getByPlaceholderText("지훈"), { target: { value: nickname } });
  }
  fireEvent.change(screen.getByPlaceholderText("30"), { target: { value: age } });
  fireEvent.change(screen.getByPlaceholderText("175"), { target: { value: heightCm } });
  fireEvent.change(screen.getByPlaceholderText("72"), { target: { value: weightKg } });
  fireEvent.change(screen.getByPlaceholderText("3"), { target: { value: weeklyTargetDays } });

  fireEvent.click(screen.getByRole("button", { name: "남성" }));
  fireEvent.click(screen.getByRole("button", { name: "초급" }));
  fireEvent.click(screen.getByRole("button", { name: "다이어트" }));

  fireEvent.click(screen.getByRole("button", { name: "프로필 저장" }));
}

describe("온보딩 페이지 /onboarding", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1[P0]: aiNoticeAcknowledged===false면 마운트 시 AI 고지 AlertDialog가 표시되고, 확인 탭 시 flags에 저장되어 닫힌다", () => {
    renderWithRouter(React.createElement(Onboarding));

    const dialog = screen.getByRole("alertdialog", {
      name: /이 서비스는 생성형 AI를 활용합니다/,
    });
    expect(dialog).toBeInTheDocument();
    expect(getFlags<AppFlags>().aiNoticeAcknowledged).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(getFlags<AppFlags>().aiNoticeAcknowledged).toBe(true);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("AC-1[P0]: flags.aiNoticeAcknowledged===true로 이미 확인한 상태면 AlertDialog가 표시되지 않는다", () => {
    localStorage.setItem(
      LS_KEYS.flags,
      JSON.stringify({
        aiNoticeAcknowledged: true,
        onboardingDone: false,
        isPremium: false,
        premiumUntil: null,
      } satisfies AppFlags),
    );

    renderWithRouter(React.createElement(Onboarding));

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("AC-2[P0]: 유효 폼 제출 시 UserProfile을 저장하고 flags.onboardingDone=true, Toast '프로필이 저장됐어요' 표시 후 navigate('/')가 호출된다", async () => {
    localStorage.setItem(
      LS_KEYS.flags,
      JSON.stringify({
        aiNoticeAcknowledged: true,
        onboardingDone: false,
        isPremium: false,
        premiumUntil: null,
      } satisfies AppFlags),
    );

    renderWithRouter(React.createElement(Onboarding));

    fillValidForm();

    expect(await screen.findByText("프로필이 저장됐어요")).toBeInTheDocument();

    const saved = getProfile<UserProfile>();
    expect(saved).not.toBeNull();
    expect(saved?.nickname).toBe("지훈");
    expect(saved?.gender).toBe("male");
    expect(saved?.age).toBe(30);
    expect(saved?.heightCm).toBe(175);
    expect(saved?.weightKg).toBe(72);
    expect(saved?.fitnessLevel).toBe("beginner");
    expect(saved?.goal).toBe("diet");
    expect(saved?.weeklyTargetDays).toBe(3);
    expect(typeof saved?.id).toBe("string");
    expect((saved?.id ?? "").length).toBeGreaterThan(0);
    expect(typeof saved?.createdAt).toBe("number");

    expect(getFlags<AppFlags>().onboardingDone).toBe(true);
    expect(mockNavigate.mock.calls[0]?.[0]).toBe("/");
  });

  it("AC-3[P1]: nickname:''으로 제출 시 '닉네임을 입력해주세요' 에러가 표시되고 저장/이동이 없다", () => {
    localStorage.setItem(
      LS_KEYS.flags,
      JSON.stringify({
        aiNoticeAcknowledged: true,
        onboardingDone: false,
        isPremium: false,
        premiumUntil: null,
      } satisfies AppFlags),
    );

    renderWithRouter(React.createElement(Onboarding));

    fillValidForm({ nickname: "" });

    expect(screen.getByText("닉네임을 입력해주세요")).toBeInTheDocument();
    expect(getProfile<UserProfile>()).toBeNull();
    expect(getFlags<AppFlags>().onboardingDone).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-4[P1]: heightCm:300으로 제출 시 '키는 120~220cm 사이로 입력해주세요' 에러가 표시되고 저장되지 않는다", () => {
    localStorage.setItem(
      LS_KEYS.flags,
      JSON.stringify({
        aiNoticeAcknowledged: true,
        onboardingDone: false,
        isPremium: false,
        premiumUntil: null,
      } satisfies AppFlags),
    );

    renderWithRouter(React.createElement(Onboarding));

    fillValidForm({ heightCm: "300" });

    expect(screen.getByText("키는 120~220cm 사이로 입력해주세요")).toBeInTheDocument();
    expect(getProfile<UserProfile>()).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-5[P1]: flags.onboardingDone===true 상태로 접근 시 즉시 navigate('/', { replace: true })로 리다이렉트되고 폼은 표시되지 않는다", () => {
    localStorage.setItem(
      LS_KEYS.flags,
      JSON.stringify({
        aiNoticeAcknowledged: true,
        onboardingDone: true,
        isPremium: false,
        premiumUntil: null,
      } satisfies AppFlags),
    );

    renderWithRouter(React.createElement(Onboarding));

    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "프로필 저장" })).toBeNull();
  });
});

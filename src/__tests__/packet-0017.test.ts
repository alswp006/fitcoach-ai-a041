import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { AppProvider } from "@/lib/AppContext";
import { LS_KEYS, saveFlags } from "@/lib/storage";
import { getChallenges } from "@/lib/storage.challenges";
import type { AppFlags } from "@/lib/types";
import Challenges from "@/pages/Challenges";

mockAll();

function makeFlags(overrides: Partial<AppFlags> = {}): AppFlags {
  return {
    aiNoticeAcknowledged: true,
    onboardingDone: true,
    isPremium: false,
    premiumUntil: null,
    ...overrides,
  };
}

function renderChallenges() {
  return renderWithRouter(
    React.createElement(AppProvider, null, React.createElement(Challenges)),
  );
}

function clickByName(name: string) {
  const el = screen.getAllByRole("button", { name })[0];
  fireEvent.click(el);
  return el;
}

describe("챌린지 페이지 /challenges", () => {
  beforeEach(() => {
    localStorage.clear();
    saveFlags(makeFlags());
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("AC-1[P0]: '참여하기' 탭 시 Challenge가 저장되고 6자리 shareCode가 화면에 표시된다", async () => {
    renderChallenges();

    clickByName("참여하기");

    await waitFor(() => {
      expect(getChallenges()).toHaveLength(1);
    });

    const stored = getChallenges()[0];
    expect(stored.shareCode).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(stored.completedDates).toEqual([]);
    expect(await screen.findByText(new RegExp(stored.shareCode))).toBeInTheDocument();
  });

  it("AC-2[P0]: '오늘 완료' 탭 시 completedDates에 오늘 날짜가 추가되고 진행률이 '0 / 7일' → '1 / 7일'로 갱신된다", async () => {
    renderChallenges();

    clickByName("참여하기");
    await waitFor(() => expect(getChallenges()).toHaveLength(1));

    expect(screen.getByText(/0\s*\/\s*7일/)).toBeInTheDocument();

    const completeButton = await screen.findByRole("button", { name: "오늘 완료" });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(getChallenges()[0].completedDates).toHaveLength(1);
    });
    expect(screen.getByText(/1\s*\/\s*7일/)).toBeInTheDocument();
  });

  it("AC-3[P0]: 같은 날 '오늘 완료' 재탭 시 진행률이 증가하지 않고 Toast '오늘은 이미 완료했어요'가 표시된다", async () => {
    renderChallenges();

    clickByName("참여하기");
    await waitFor(() => expect(getChallenges()).toHaveLength(1));

    const completeButton = await screen.findByRole("button", { name: "오늘 완료" });
    fireEvent.click(completeButton);
    await waitFor(() => expect(getChallenges()[0].completedDates).toHaveLength(1));

    fireEvent.click(completeButton);

    expect(await screen.findByText("오늘은 이미 완료했어요")).toBeInTheDocument();
    expect(getChallenges()[0].completedDates).toHaveLength(1);
    expect(screen.getByText(/1\s*\/\s*7일/)).toBeInTheDocument();
  });

  it("AC-4[P1]: 참여 챌린지 0개면 EmptyState('참여 중인 챌린지가 없어요') + '챌린지 참여하기' CTA가 표시된다", () => {
    renderChallenges();

    expect(screen.getByText("참여 중인 챌린지가 없어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "챌린지 참여하기" })).toBeInTheDocument();
  });

  it("AC-4[edge]: 저장된 challenges 데이터가 손상되어도 크래시 없이 EmptyState로 폴백한다", () => {
    localStorage.setItem(LS_KEYS.challenges, "{이건 유효한 json이 아님");

    expect(() => renderChallenges()).not.toThrow();
    expect(screen.getByText("참여 중인 챌린지가 없어요")).toBeInTheDocument();
  });

  it("AC-5[P1]: shareCode 복사 버튼 탭 시 클립보드에 코드가 복사되고 Toast '코드를 복사했어요'가 표시된다", async () => {
    renderChallenges();

    clickByName("참여하기");
    await waitFor(() => expect(getChallenges()).toHaveLength(1));
    const stored = getChallenges()[0];

    const copyButton = await screen.findByRole("button", { name: /복사/ });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(stored.shareCode);
    });
    expect(await screen.findByText("코드를 복사했어요")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { AppProvider } from "@/lib/AppContext";
import { saveFlags, getFlags } from "@/lib/storage";
import type { AppFlags } from "@/lib/types";
import Premium from "@/pages/Premium";
import { IAP } from "@apps-in-toss/web-framework";

mockAll();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function makeFlags(overrides: Partial<AppFlags> = {}): AppFlags {
  return {
    aiNoticeAcknowledged: true,
    onboardingDone: true,
    isPremium: false,
    premiumUntil: null,
    ...overrides,
  };
}

function renderPremium() {
  return renderWithRouter(
    React.createElement(AppProvider, null, React.createElement(Premium)),
  );
}

function getPurchaseButton() {
  return screen.getByRole("button");
}

describe("프리미엄 페이지 /premium", () => {
  beforeEach(() => {
    localStorage.clear();
    saveFlags(makeFlags());
  });

  it("AC-1[P0]: 비프리미엄 사용자에게 TossPurchase 결제 버튼이 렌더된다", () => {
    renderPremium();

    const button = getPurchaseButton();
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe("BUTTON");
  });

  it("AC-5: 월 12,900원 가격이 화면에 명시된다", () => {
    renderPremium();

    expect(screen.getByText(/12,900원/)).toBeInTheDocument();
    expect(screen.getByText(/월\s*12,900원/)).toBeInTheDocument();
  });

  it("AC-2[P0]: 결제 성공 시 setPremium(Date.now()+30일)이 호출되어 flags.isPremium=true가 저장되고 화면에 즉시 반영된다", async () => {
    renderPremium();
    const before = Date.now();

    fireEvent.click(getPurchaseButton());

    await waitFor(() => {
      expect(getFlags<AppFlags>().isPremium).toBe(true);
    });

    const stored = getFlags<AppFlags>();
    expect(stored.premiumUntil).not.toBeNull();
    expect(stored.premiumUntil as number).toBeGreaterThanOrEqual(before + THIRTY_DAYS_MS - 5000);
    expect(stored.premiumUntil as number).toBeLessThanOrEqual(Date.now() + THIRTY_DAYS_MS + 5000);

    // 홈/플랜 화면과 공유하는 AppContext 상태이므로, 결제 화면 자체도 재렌더 없이 즉시 반영돼야 한다.
    await waitFor(() => {
      expect(screen.getByText(/까지 이용할 수 있어요/)).toBeInTheDocument();
    });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("AC-3[P0]: 이미 프리미엄이면 결제 버튼 대신 '2026년 8월 16일까지 이용할 수 있어요' 형식의 만료일이 표시된다", () => {
    const until = new Date(2026, 7, 16, 12, 0, 0).getTime();
    saveFlags(makeFlags({ isPremium: true, premiumUntil: until }));

    renderPremium();

    expect(screen.getByText("2026년 8월 16일까지 이용할 수 있어요")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("AC-4: 결제 취소/실패 시 flags가 변경되지 않고 화면이 유지되며 크래시하지 않는다", async () => {
    vi.mocked(IAP.createOneTimePurchaseOrder).mockImplementationOnce((opts: any) => {
      opts.onError?.(new Error("USER_CANCELED"));
      return () => {};
    });

    renderPremium();

    expect(() => fireEvent.click(getPurchaseButton())).not.toThrow();

    await waitFor(() => {
      expect(getPurchaseButton()).not.toBeDisabled();
    });

    const stored = getFlags<AppFlags>();
    expect(stored.isPremium).toBe(false);
    expect(stored.premiumUntil).toBeNull();
    expect(getPurchaseButton()).toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { saveFlags } from "@/lib/storage";
import type { AppFlags } from "@/lib/types";
import App from "@/App";

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

describe("repro2", () => {
  it("test A - /", () => {
    saveFlags(makeFlags());
    render(
      React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)),
    );
    console.log("A done");
  });

  it("test B - /plan", () => {
    saveFlags(makeFlags());
    const { container } = render(
      React.createElement(MemoryRouter, { initialEntries: ["/plan"] }, React.createElement(App)),
    );
    console.log("B body:", container.innerHTML.slice(0, 300));
  });
});

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { saveFlags } from "@/lib/storage";
import App from "@/App";

mockTds();
mockAppsInToss();
mockTossRewardAd();

describe("debug", () => {
  it("direct /plan entry (no redirect effect involved)", () => {
    saveFlags({ aiNoticeAcknowledged: true, onboardingDone: true, isPremium: false, premiumUntil: null });
    render(React.createElement(MemoryRouter, { initialEntries: ["/plan"] }, React.createElement(App)));
    console.log("TABLIST_PRESENT:", !!screen.queryByRole("tablist"));
  });

  it("direct /challenges entry", () => {
    saveFlags({ aiNoticeAcknowledged: true, onboardingDone: true, isPremium: false, premiumUntil: null });
    render(React.createElement(MemoryRouter, { initialEntries: ["/challenges"] }, React.createElement(App)));
    console.log("TABLIST_PRESENT:", !!screen.queryByRole("tablist"));
  });

  it("direct /premium entry", () => {
    saveFlags({ aiNoticeAcknowledged: true, onboardingDone: true, isPremium: false, premiumUntil: null });
    render(React.createElement(MemoryRouter, { initialEntries: ["/premium"] }, React.createElement(App)));
    console.log("TABLIST_PRESENT:", !!screen.queryByRole("tablist"));
  });
});

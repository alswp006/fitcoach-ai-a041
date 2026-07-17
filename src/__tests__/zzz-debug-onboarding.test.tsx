import { describe, it } from "vitest";
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
  it("onboarding redirect debug", () => {
    saveFlags({ aiNoticeAcknowledged: true, onboardingDone: true, isPremium: false, premiumUntil: null });
    render(React.createElement(MemoryRouter, { initialEntries: ["/onboarding"] }, React.createElement(App)));
    screen.debug(undefined, 100000);
  });
});

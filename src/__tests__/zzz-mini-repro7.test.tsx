import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { AppProvider } from "@/lib/AppContext";
import { saveFlags } from "@/lib/storage";
import Home from "@/pages/Home";
import Plan from "@/pages/Plan";

mockTds();
mockAppsInToss();
mockTossRewardAd();

function Inner() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

function makeFlags() {
  return { aiNoticeAcknowledged: true, onboardingDone: true, isPremium: false, premiumUntil: null };
}

describe("repro7", () => {
  it("test A - / with Home", () => {
    saveFlags(makeFlags());
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppProvider>
          <Home />
          <Inner />
        </AppProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId("path").textContent).toBe("/");
  });

  it("test B - /plan with Plan (after Home rendered in test A)", () => {
    saveFlags(makeFlags());
    render(
      <MemoryRouter initialEntries={["/plan"]}>
        <AppProvider>
          <Plan />
          <Inner />
        </AppProvider>
      </MemoryRouter>
    );
    console.log("B pathname:", screen.getByTestId("path").textContent);
  });
});

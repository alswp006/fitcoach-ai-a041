import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { AppProvider } from "@/lib/AppContext";
import { saveFlags } from "@/lib/storage";
import Home from "@/pages/Home";
import Plan from "@/pages/Plan";

mockTds();
mockAppsInToss();
mockTossRewardAd();

function makeFlags() {
  return { aiNoticeAcknowledged: true, onboardingDone: true, isPremium: false, premiumUntil: null };
}

const TAB_BAR_PATHS = new Set(["/", "/plan", "/challenges"]);

function SimpleConditional() {
  const location = useLocation();
  console.log("SIMPLE pathname=", location.pathname);
  return <div data-testid="simple">{location.pathname}</div>;
}

describe("repro9", () => {
  it("variant: conditional sibling using a SIMPLE inline component instead of AppTabBar", () => {
    saveFlags(makeFlags());
    function AppRoutes() {
      const location = useLocation();
      console.log("R9 AppRoutes pathname=", location.pathname);
      return (
        <>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {TAB_BAR_PATHS.has(location.pathname) && <SimpleConditional />}
        </>
      );
    }
    render(
      <MemoryRouter initialEntries={["/plan"]}>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );
    console.log("simple text:", screen.getByTestId("simple").textContent);
  });
});

import { describe, it } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { AppProvider, useApp } from "@/lib/AppContext";
import { saveFlags } from "@/lib/storage";
import Home from "@/pages/Home";
import Plan from "@/pages/Plan";
import { AppTabBar } from "@/components/AppTabBar";
import type { ReactElement } from "react";

mockTds();
mockAppsInToss();
mockTossRewardAd();

const TAB_BAR_PATHS = new Set(["/", "/plan", "/challenges"]);

function RequireOnboarding({ children }: { children: ReactElement }) {
  const { flags } = useApp();
  if (!flags.onboardingDone) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function AppRoutes() {
  const location = useLocation();
  console.log("PROBE6 pathname=", location.pathname);
  return (
    <>
      <Routes>
        <Route path="/" element={<RequireOnboarding><Home /></RequireOnboarding>} />
        <Route path="/plan" element={<RequireOnboarding><Plan /></RequireOnboarding>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {TAB_BAR_PATHS.has(location.pathname) && <AppTabBar />}
    </>
  );
}

describe("probe6", () => {
  it("minimal 2-route + real AppTabBar", () => {
    saveFlags({ aiNoticeAcknowledged: true, onboardingDone: true, isPremium: false, premiumUntil: null });
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/plan"] },
        React.createElement(AppProvider, null, React.createElement(AppRoutes)),
      ),
    );
  });
});

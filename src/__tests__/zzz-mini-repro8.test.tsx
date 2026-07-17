import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { AppProvider } from "@/lib/AppContext";
import { saveFlags } from "@/lib/storage";
import { AppTabBar } from "@/components/AppTabBar";
import Home from "@/pages/Home";
import Plan from "@/pages/Plan";

mockTds();
mockAppsInToss();
mockTossRewardAd();

function makeFlags() {
  return { aiNoticeAcknowledged: true, onboardingDone: true, isPremium: false, premiumUntil: null };
}

const TAB_BAR_PATHS = new Set(["/", "/plan", "/challenges"]);

describe("repro8", () => {
  it("variant 1: Routes(2) + catchall + AppTabBar sibling, single test, /plan", () => {
    saveFlags(makeFlags());
    function AppRoutes() {
      const location = useLocation();
      console.log("R8V1 AppRoutes pathname=", location.pathname);
      return (
        <>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {TAB_BAR_PATHS.has(location.pathname) && <AppTabBar />}
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
    const tabs = screen.queryAllByRole("tab");
    console.log("R8V1 tabs:", tabs.map((t) => [t.getAttribute("aria-label"), t.getAttribute("aria-selected")]));
  });
});

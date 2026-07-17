import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { AppProvider } from "@/lib/AppContext";
import { saveFlags } from "@/lib/storage";
import Plan from "@/pages/Plan";

mockTds();
mockAppsInToss();
mockTossRewardAd();

function LocationProbe() {
  const loc = useLocation();
  console.log("PROBE PATHNAME", JSON.stringify(loc.pathname));
  return null;
}

describe("debug", () => {
  it("plan page directly", () => {
    saveFlags({ aiNoticeAcknowledged: true, onboardingDone: true, isPremium: false, premiumUntil: null });
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/plan"] },
        React.createElement(AppProvider, null,
          React.createElement(LocationProbe),
          React.createElement(Routes, null,
            React.createElement(Route, { path: "/plan", element: React.createElement(Plan) }),
          ),
        ),
      ),
    );
    const tabs = screen.queryAllByRole("tab");
    console.log("TABS", tabs.map((t) => [t.getAttribute("aria-label"), t.getAttribute("aria-selected")]));
  });
});

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
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

// Inline copy of FloatingTabBar's exact logic, defined in the TEST FILE (not imported).
function InlineTabBar({ items }: { items: { label: string; path: string }[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  console.log("INLINE_TABBAR pathname=", location.pathname);
  return (
    <nav role="tablist" aria-label="메인 네비게이션">
      {items.map((item) => {
        const active = location.pathname === item.path;
        return (
          <button
            key={item.path}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={item.label}
            onClick={() => {
              try {
                Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
              } catch {
                /* ignore */
              }
              navigate(item.path);
            }}
          >
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

const TAB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "플랜", path: "/plan" },
  { label: "챌린지", path: "/challenges" },
];

describe("repro10", () => {
  it("variant: FloatingTabBar logic INLINED in test file (not imported)", () => {
    saveFlags(makeFlags());
    function AppRoutes() {
      const location = useLocation();
      console.log("R10 AppRoutes pathname=", location.pathname);
      return (
        <>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {TAB_BAR_PATHS.has(location.pathname) && <InlineTabBar items={TAB_ITEMS} />}
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
    console.log("R10 tabs:", tabs.map((t) => [t.getAttribute("aria-label"), t.getAttribute("aria-selected")]));
  });
});

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

describe("repro3", () => {
  it("test A - /", () => {
    saveFlags(makeFlags());
    render(
      React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)),
    );
    console.log("A: body.children.length=", document.body.children.length);
    console.log("A: tablists=", document.querySelectorAll('[role="tablist"]').length);
  });

  it("test B - /plan", () => {
    saveFlags(makeFlags());
    console.log("B start: body.children.length=", document.body.children.length);
    console.log("B start: tablists=", document.querySelectorAll('[role="tablist"]').length);
    render(
      React.createElement(MemoryRouter, { initialEntries: ["/plan"] }, React.createElement(App)),
    );
    console.log("B end: body.children.length=", document.body.children.length);
    console.log("B end: tablists=", document.querySelectorAll('[role="tablist"]').length);
    const tabs = screen.getAllByRole("tab");
    console.log("B tabs active=", tabs.map((t) => [t.getAttribute("aria-label"), t.getAttribute("aria-selected")]));
  });
});

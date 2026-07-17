import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();
mockTossRewardAd();

function Inner() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

describe("repro6", () => {
  it("test A - /a", () => {
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <Inner />
      </MemoryRouter>
    );
    expect(screen.getByTestId("path").textContent).toBe("/a");
  });

  it("test B - /b", () => {
    render(
      <MemoryRouter initialEntries={["/b"]}>
        <Inner />
      </MemoryRouter>
    );
    console.log("B pathname:", screen.getByTestId("path").textContent);
  });
});

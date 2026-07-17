import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

function Inner() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

describe("repro", () => {
  it("test A - /a", () => {
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <Inner />
      </MemoryRouter>
    );
    console.log("A body:", document.body.innerHTML);
    expect(screen.getByTestId("path").textContent).toBe("/a");
  });

  it("test B - /b", () => {
    render(
      <MemoryRouter initialEntries={["/b"]}>
        <Inner />
      </MemoryRouter>
    );
    console.log("B body:", document.body.innerHTML);
    expect(screen.getByTestId("path").textContent).toBe("/b");
  });
});

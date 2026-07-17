import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

function Inner() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

describe("repro5", () => {
  it("test A - /a (with MemoryRouter, real history)", () => {
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <Inner />
      </MemoryRouter>
    );
    expect(screen.getByTestId("path").textContent).toBe("/a");
  });

  it("test B - /b (second MemoryRouter mount in same process)", () => {
    render(
      <MemoryRouter initialEntries={["/b"]}>
        <Inner />
      </MemoryRouter>
    );
    console.log("B pathname:", screen.getByTestId("path").textContent);
  });

  it("test C - /c (third mount, TWO siblings both reading useLocation)", () => {
    function Sibling1() {
      const l = useLocation();
      return <div data-testid="s1">{l.pathname}</div>;
    }
    function Sibling2() {
      const l = useLocation();
      return <div data-testid="s2">{l.pathname}</div>;
    }
    render(
      <MemoryRouter initialEntries={["/c"]}>
        <Sibling1 />
        <Sibling2 />
      </MemoryRouter>
    );
    console.log("C s1:", screen.getByTestId("s1").textContent, "s2:", screen.getByTestId("s2").textContent);
  });
});

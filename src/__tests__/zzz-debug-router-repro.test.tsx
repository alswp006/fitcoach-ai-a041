import { describe, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AppProvider } from "@/lib/AppContext";
import { saveFlags } from "@/lib/storage";

function Inner() {
  const location = useLocation();
  console.log("REPRO Inner location.pathname=", location.pathname);
  return <div>{location.pathname}</div>;
}

function A() {
  console.log("REPRO A render");
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate("/b", { replace: true });
  }, []);
  return <div>A</div>;
}

function B() {
  console.log("REPRO B render");
  return <div>B</div>;
}

function Root() {
  const location = useLocation();
  console.log("REPRO Root location.pathname=", location.pathname);
  return (
    <>
      <Inner />
      <Routes>
        <Route path="/a" element={<A />} />
        <Route path="/b" element={<B />} />
      </Routes>
    </>
  );
}

describe("debug", () => {
  it("router repro", () => {
    saveFlags({ aiNoticeAcknowledged: true, onboardingDone: true, isPremium: false, premiumUntil: null });
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/a"] },
        React.createElement(AppProvider, null, React.createElement(Root)),
      ),
    );
    screen.debug(undefined, 100000);
  });
});

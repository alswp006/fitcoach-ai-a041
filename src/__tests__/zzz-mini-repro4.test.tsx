import { describe, it, expect } from "vitest";
import { useLocation } from "react-router-dom";

describe("repro4", () => {
  it("checks module identity", async () => {
    await import("@/components/FloatingTabBar");
    const ftbUseLocation = (globalThis as any).__debugHooks?.FloatingTabBar_useLocation;
    console.log("same reference?", ftbUseLocation === useLocation);
    console.log("testfile useLocation:", useLocation.toString().slice(0, 80));
    console.log("ftb useLocation:", ftbUseLocation?.toString().slice(0, 80));
  });
});

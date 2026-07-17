import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { AppProvider } from "@/lib/AppContext";
import { saveFlags, saveProfile } from "@/lib/storage";
import { LS_KEYS } from "@/lib/storage";
import type { AppFlags, UserProfile, WorkoutSession } from "@/lib/types";
import Home from "@/pages/Home";
import App from "@/App";

// NOTE: App-integration test (AC-4) renders real routes/useLocation like packet-0019,
// so we don't mock react-router-dom's useNavigate/useLocation globally.
mockTds();
mockAppsInToss();
mockTossRewardAd();

const SRC_ROOT = path.resolve(process.cwd(), "src");

function walkFiles(dir: string, exts: string[], excludeDirs: string[] = ["__tests__"]): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excludeDirs.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, exts, excludeDirs));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function findViolations(files: string[], pattern: RegExp): string[] {
  const violations: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    lines.forEach((line, i) => {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        violations.push(`${path.relative(SRC_ROOT, file)}:${i + 1}: ${line.trim()}`);
      }
    });
  }
  return violations;
}

function makeFlags(overrides: Partial<AppFlags> = {}): AppFlags {
  return {
    aiNoticeAcknowledged: true,
    onboardingDone: true,
    isPremium: false,
    premiumUntil: null,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "user-1",
    nickname: "테스터",
    gender: "none",
    age: 30,
    heightCm: 170,
    weightKg: 65,
    fitnessLevel: "beginner",
    goal: "health",
    weeklyTargetDays: 3,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: "session-1",
    exerciseId: "squat",
    date: "2026-07-13",
    startedAt: Date.now(),
    durationSec: 300,
    totalReps: 20,
    avgFormScore: 88,
    caloriesBurned: 120,
    feedbackCounts: {},
    ...overrides,
  };
}

function renderHome() {
  return renderWithRouter(
    React.createElement(AppProvider, null, React.createElement(Home)),
  );
}

describe("광고 배치 + 최종 준수 스윕", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("AC-1[P0]: 홈 최근 기록 섹션 아래에 AdSlot(adGroupId=import.meta.env.VITE_TOSS_AD_GROUP_ID)이 렌더되고 콘텐츠를 가리지 않는다", () => {
    it("Home.tsx 소스가 AdSlot을 import하고 VITE_TOSS_AD_GROUP_ID를 adGroupId로 연결한다", () => {
      const homeSource = fs.readFileSync(path.resolve(SRC_ROOT, "pages/Home.tsx"), "utf-8");

      expect(homeSource).toMatch(/import\s*\{[^}]*AdSlot[^}]*\}\s*from\s*['"]@\/components\/AdSlot['"]/);
      expect(homeSource).toMatch(/<AdSlot[\s\S]*?adGroupId=\{import\.meta\.env\.VITE_TOSS_AD_GROUP_ID\}/);
    });

    it("최근 기록 카드 렌더 이후(문서 순서상 다음)에 AdSlot 배너 엘리먼트가 렌더된다", () => {
      saveFlags(makeFlags());
      saveProfile(makeProfile());
      localStorage.setItem(
        LS_KEYS.sessions,
        JSON.stringify([makeSession({ id: "session-1", startedAt: 1000 })]),
      );

      const { container } = renderHome();

      const recentCard = screen.getByTestId("recent-card");
      expect(recentCard).toBeInTheDocument();

      const adSlotEl = container.querySelector(".ad-slot");
      expect(adSlotEl).not.toBeNull();

      const position = recentCard.compareDocumentPosition(adSlotEl as Node);
      // eslint-disable-next-line no-bitwise
      expect(Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

      // 광고가 콘텐츠를 가리지 않음 — 최근 기록 텍스트가 여전히 접근 가능해야 한다
      expect(screen.getByText(/120kcal|120\s*kcal/)).toBeInTheDocument();
    });
  });

  describe("AC-2[P0]: 소스 전체에 HEX 색상 리터럴 0건, Tailwind 여백(p-/m-/gap-) 클래스 0건", () => {
    const files = walkFiles(path.join(SRC_ROOT, "pages"), [".ts", ".tsx"])
      .concat(walkFiles(path.join(SRC_ROOT, "components"), [".ts", ".tsx"]))
      .concat(walkFiles(path.join(SRC_ROOT, "lib"), [".ts", ".tsx"]))
      .concat([path.join(SRC_ROOT, "App.tsx")].filter((f) => fs.existsSync(f)));

    it("하드코딩된 HEX 색상 리터럴이 없다", () => {
      const violations = findViolations(files, /#[0-9a-fA-F]{3,8}\b/);
      expect(violations).toEqual([]);
    });

    it("Tailwind 여백 유틸리티 클래스(p-/m-/gap-)가 없다", () => {
      const violations = findViolations(
        files,
        /className="[^"]*\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y)-(?:\[|[0-9])/,
      );
      expect(violations).toEqual([]);
    });
  });

  describe("AC-3[P0]: shadcn/mui/antd/chakra/stripe/admob/firebase import 0건", () => {
    const files = walkFiles(SRC_ROOT, [".ts", ".tsx"]);

    it("금지된 외부 라이브러리/서비스 import가 없다", () => {
      const violations = findViolations(
        files,
        /from\s+['"][^'"]*(shadcn|@mui|mui\/|antd|@chakra-ui|stripe|admob|firebase)[^'"]*['"]/i,
      );
      expect(violations).toEqual([]);
    });
  });

  describe("AC-4[P0]: 프로덕션 빌드 후 전 화면 순회 시 console.error가 0개다", () => {
    const routes = [
      "/",
      "/onboarding",
      "/plan",
      "/workout/does-not-exist",
      "/report/does-not-exist",
      "/challenges",
      "/premium",
    ];

    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      saveFlags(makeFlags());
      saveProfile(makeProfile());
      errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      errorSpy.mockRestore();
    });

    it.each(routes)("경로 %s 렌더 시 console.error가 호출되지 않는다", (route) => {
      render(
        React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(App)),
      );

      expect(errorSpy).not.toHaveBeenCalled();
      expect(errorSpy.mock.calls.length).toBe(0);
    });
  });

  describe("AC-5[P0]: position:fixed 하단 요소 모두에 safe-area 대응 paddingBottom이 적용되어 있다", () => {
    it("전역 CSS가 --toss-safe-area-bottom(또는 동등 변수)을 env(safe-area-inset-bottom)로 정의한다", () => {
      const cssFiles = walkFiles(SRC_ROOT, [".css"]);
      const definedVarNames: string[] = [];
      for (const file of cssFiles) {
        const content = fs.readFileSync(file, "utf-8");
        const matches = content.matchAll(/--([a-zA-Z0-9-]+)\s*:\s*env\(safe-area-inset-bottom\)/g);
        for (const m of matches) definedVarNames.push(m[1]);
      }
      expect(definedVarNames.length).toBeGreaterThan(0);
    });

    it("position:fixed + bottom:0 스타일을 쓰는 컴포넌트마다 safe-area-inset-bottom(직접 env() 또는 정의된 CSS 변수)이 padding에 포함된다", () => {
      const cssFiles = walkFiles(SRC_ROOT, [".css"]);
      const definedVarNames = new Set<string>();
      for (const file of cssFiles) {
        const content = fs.readFileSync(file, "utf-8");
        const matches = content.matchAll(/--([a-zA-Z0-9-]+)\s*:\s*env\(safe-area-inset-bottom\)/g);
        for (const m of matches) definedVarNames.add(m[1]);
      }

      const tsxFiles = walkFiles(path.join(SRC_ROOT, "components"), [".tsx"]).concat(
        walkFiles(path.join(SRC_ROOT, "pages"), [".tsx"]),
      );

      const offenders: string[] = [];

      for (const file of tsxFiles) {
        const content = fs.readFileSync(file, "utf-8");
        // Find style object blocks that declare position: fixed/"fixed" AND bottom: 0
        const blockRegex = /\{[^{}]*position:\s*['"]fixed['"][^{}]*\}/g;
        const blocks = content.match(blockRegex) ?? [];
        for (const block of blocks) {
          const hasBottomZero = /bottom:\s*0\b/.test(block);
          if (!hasBottomZero) continue;

          const hasDirectEnv = /env\(safe-area-inset-bottom\)/.test(block);
          const usesDefinedVar = [...definedVarNames].some((name) =>
            new RegExp(`var\\(--${name}\\)`).test(block),
          );

          if (!hasDirectEnv && !usesDefinedVar) {
            offenders.push(`${path.relative(SRC_ROOT, file)}: ${block.replace(/\s+/g, " ").trim()}`);
          }
        }
      }

      expect(offenders).toEqual([]);
    });
  });
});

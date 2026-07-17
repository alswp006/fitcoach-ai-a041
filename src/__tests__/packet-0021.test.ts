import { describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { saveFlags, saveProfile } from "@/lib/storage";
import type { AppFlags, UserProfile } from "@/lib/types";
import App from "@/App";

// NOTE: this packet tests real routing/Provider wiring, so react-router-dom's
// useNavigate/useLocation are NOT globally mocked — App must render the real tree.
mockTds();
mockAppsInToss();
mockTossRewardAd();

const SRC_ROOT = path.resolve(process.cwd(), "src");
const APP_TSX = path.resolve(SRC_ROOT, "App.tsx");
const MAIN_TSX = path.resolve(SRC_ROOT, "main.tsx");

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

/** App.tsx의 <Route path="..."> 선언 목록을 추출한다. */
function extractRoutePaths(): string[] {
  const source = fs.readFileSync(APP_TSX, "utf-8");
  const matches = source.matchAll(/<Route\s+path="([^"]+)"/g);
  return [...matches].map((m) => m[1]);
}

/** 라우트 경로("/workout/:exerciseId", "*")를 매칭용 정규식으로 변환한다. */
function routeToRegex(routePath: string): RegExp {
  if (routePath === "*") return /^\/.*$/;
  const escaped = routePath
    .split("/")
    .map((segment) => (segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${escaped}$`);
}

/** src/pages, src/components 전체에서 navigate(...) 호출의 대상 문자열을 수집한다. */
function extractNavigateTargets(): string[] {
  const files = walkFiles(path.join(SRC_ROOT, "pages"), [".tsx"]).concat(
    walkFiles(path.join(SRC_ROOT, "components"), [".tsx"]),
  );
  const targets: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const matches = content.matchAll(/navigate\(\s*(`[^`]*`|'[^']*'|"[^"]*"|-1)/g);
    for (const m of matches) targets.push(m[1]);
  }
  return targets;
}

describe("라우팅 와이어링 + Provider 연결 + 통합 폴리시", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("AC-1[P0]: App.tsx에 모든 페이지 Route가 정의되어 있다", () => {
    const PAGES: Array<{ name: string; importPath: string }> = [
      { name: "Home", importPath: "./pages/Home" },
      { name: "Onboarding", importPath: "./pages/Onboarding" },
      { name: "Plan", importPath: "./pages/Plan" },
      { name: "Workout", importPath: "./pages/Workout" },
      { name: "Report", importPath: "./pages/Report" },
      { name: "Challenges", importPath: "./pages/Challenges" },
      { name: "Premium", importPath: "./pages/Premium" },
    ];

    it("App.tsx가 8개 페이지 컴포넌트를 모두 import한다", () => {
      const source = fs.readFileSync(APP_TSX, "utf-8");
      for (const page of PAGES) {
        expect(source).toMatch(new RegExp(`import\\s+${page.name}\\s+from\\s+['"]${page.importPath.replace(/[./]/g, "\\$&")}['"]`));
      }
      expect(PAGES.length).toBe(7);
    });

    it("각 페이지 컴포넌트마다 대응하는 <Route> 엘리먼트가 존재한다", () => {
      const source = fs.readFileSync(APP_TSX, "utf-8");
      for (const page of PAGES) {
        expect(source).toMatch(new RegExp(`<${page.name}\\b`));
      }
      const routePaths = extractRoutePaths();
      expect(routePaths).toEqual(
        expect.arrayContaining(["/", "/onboarding", "/plan", "/challenges", "/premium"]),
      );
      expect(routePaths.some((p) => routeToRegex(p).test("/workout/squat"))).toBe(true);
      expect(routePaths.some((p) => routeToRegex(p).test("/report/session-1"))).toBe(true);
    });
  });

  describe("AC-2[P0]: 모든 navigate() 대상에 Route가 존재한다", () => {
    it("페이지/컴포넌트 소스에서 발견된 navigate() 대상 경로가 최소 5개이며 모두 App.tsx 라우트와 매칭된다", () => {
      const targets = extractNavigateTargets();
      expect(targets.length).toBeGreaterThanOrEqual(5);

      const routePaths = extractRoutePaths();
      const routeRegexes = routePaths.map(routeToRegex);

      const unmatched: string[] = [];
      for (const raw of targets) {
        if (raw === "-1") continue; // 브라우저 back — 라우트 아님
        // 템플릿 리터럴의 ${...} 보간은 임의 세그먼트로 취급
        const literal = raw
          .slice(1, -1)
          .replace(/\$\{[^}]*\}/g, "__DYNAMIC__");
        const asPath = literal.startsWith("/") ? literal : `/${literal}`;
        const normalized = asPath.replace(/__DYNAMIC__/g, "x");
        const matched = routeRegexes.some((re) => re.test(normalized));
        if (!matched) unmatched.push(raw);
      }
      expect(unmatched).toEqual([]);
    });

    it("동적 세그먼트를 쓰는 /workout/:exerciseId, /report/:sessionId 라우트가 실제 navigate 대상과 매칭된다", () => {
      const targets = extractNavigateTargets().filter((t) => t !== "-1");
      const workoutTargets = targets.filter((t) => /\/workout\//.test(t));
      const reportTargets = targets.filter((t) => /\/report\//.test(t));
      expect(workoutTargets.length).toBeGreaterThan(0);
      expect(reportTargets.length).toBeGreaterThan(0);

      const routePaths = extractRoutePaths();
      expect(routePaths).toContain("/workout/:exerciseId");
      expect(routePaths).toContain("/report/:sessionId");
    });
  });

  describe("AC-3[P0]: main.tsx의 TDSMobileAITProvider/BrowserRouter가 유지되어 있다", () => {
    it("main.tsx(@AI:ANCHOR)가 TDSMobileAITProvider와 BrowserRouter로 App을 감싼다", () => {
      const source = fs.readFileSync(MAIN_TSX, "utf-8");
      expect(source).toMatch(/@AI:ANCHOR/);
      expect(source).toMatch(/import\s*\{\s*TDSMobileAITProvider\s*\}\s*from\s*['"]@toss\/tds-mobile-ait['"]/);
      expect(source).toMatch(/import\s*\{\s*BrowserRouter\s*\}\s*from\s*['"]react-router-dom['"]/);
    });

    it("main.tsx에서 <TDSMobileAITProvider>가 <BrowserRouter>를 감싸고 그 안에 <App />이 렌더된다(중첩 순서)", () => {
      const source = fs.readFileSync(MAIN_TSX, "utf-8");
      const providerIdx = source.indexOf("<TDSMobileAITProvider");
      const routerIdx = source.indexOf("<BrowserRouter");
      const appIdx = source.indexOf("<App");
      expect(providerIdx).toBeGreaterThan(-1);
      expect(routerIdx).toBeGreaterThan(providerIdx);
      expect(appIdx).toBeGreaterThan(routerIdx);
    });
  });

  describe("AC-4[P0]: 앱이 '/' 경로에서 정상 렌더링된다", () => {
    it("온보딩 완료 상태로 '/'를 렌더하면 크래시 없이 Home 화면(home-hero)이 나타난다", () => {
      saveFlags(makeFlags({ onboardingDone: true }));
      saveProfile(makeProfile());

      render(
        React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)),
      );

      expect(screen.getByTestId("home-hero")).toBeInTheDocument();
      expect(screen.queryByText("나에게 맞는 코치를 만들어요")).not.toBeInTheDocument();
    });

    it("온보딩 미완료 상태로 '/'를 렌더하면 크래시 없이 /onboarding 화면으로 리다이렉트된다(RequireOnboarding 가드)", () => {
      saveFlags(makeFlags({ onboardingDone: false }));

      render(
        React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)),
      );

      // RequireOnboarding이 /onboarding으로 replace 리다이렉트하므로 Onboarding 화면 제목이 보이고
      // Home 전용 히어로 카드(home-hero)는 나타나지 않아야 한다.
      expect(screen.getByText("나에게 맞는 코치를 만들어요")).toBeInTheDocument();
      expect(screen.queryByTestId("home-hero")).not.toBeInTheDocument();
    });
  });
});

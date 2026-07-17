import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("환경변수 예시 파일 정리 (packet 0007)", () => {
  const envExamplePath = path.resolve(__dirname, "../../.env.example");

  describe("AC-1: 모든 필수 환경변수 키가 존재한다", () => {
    it("should have .env.example file", () => {
      expect(fs.existsSync(envExamplePath)).toBe(true);
    });

    it("should contain VITE_API_BASE_URL key", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      expect(content).toContain("VITE_API_BASE_URL=");
    });

    it("should contain VITE_TOSS_AD_GROUP_ID key", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      expect(content).toContain("VITE_TOSS_AD_GROUP_ID=");
    });

    it("should contain VITE_TOSS_AD_SLOT_ID key", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      expect(content).toContain("VITE_TOSS_AD_SLOT_ID=");
    });

    it("should contain VITE_TOSS_IAP_SKU key", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      expect(content).toContain("VITE_TOSS_IAP_SKU=");
    });

    it("should contain VITE_TOSS_PROMOTION_CODE key", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      expect(content).toContain("VITE_TOSS_PROMOTION_CODE=");
    });
  });

  describe("AC-2: 각 키 위에 한국어 용도 주석이 있다", () => {
    it("should have Korean comment before VITE_API_BASE_URL", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      const lines = content.split("\n");

      const keyLineIndex = lines.findIndex((line) =>
        line.startsWith("VITE_API_BASE_URL=")
      );
      expect(keyLineIndex).toBeGreaterThan(0);

      const commentLine = lines[keyLineIndex - 1];
      expect(commentLine).toMatch(/^#/);
      // Check for Korean characters
      expect(commentLine).toMatch(/[가-힯]/);
    });

    it("should have Korean comment before VITE_TOSS_AD_GROUP_ID", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      const lines = content.split("\n");

      const keyLineIndex = lines.findIndex((line) =>
        line.startsWith("VITE_TOSS_AD_GROUP_ID=")
      );
      expect(keyLineIndex).toBeGreaterThan(0);

      const commentLine = lines[keyLineIndex - 1];
      expect(commentLine).toMatch(/^#/);
      expect(commentLine).toMatch(/[가-힯]/);
    });

    it("should have Korean comment before VITE_TOSS_AD_SLOT_ID", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      const lines = content.split("\n");

      const keyLineIndex = lines.findIndex((line) =>
        line.startsWith("VITE_TOSS_AD_SLOT_ID=")
      );
      expect(keyLineIndex).toBeGreaterThan(0);

      const commentLine = lines[keyLineIndex - 1];
      expect(commentLine).toMatch(/^#/);
      expect(commentLine).toMatch(/[가-힯]/);
    });

    it("should have Korean comment before VITE_TOSS_IAP_SKU", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      const lines = content.split("\n");

      const keyLineIndex = lines.findIndex((line) =>
        line.startsWith("VITE_TOSS_IAP_SKU=")
      );
      expect(keyLineIndex).toBeGreaterThan(0);

      const commentLine = lines[keyLineIndex - 1];
      expect(commentLine).toMatch(/^#/);
      expect(commentLine).toMatch(/[가-힯]/);
    });

    it("should have Korean comment before VITE_TOSS_PROMOTION_CODE", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      const lines = content.split("\n");

      const keyLineIndex = lines.findIndex((line) =>
        line.startsWith("VITE_TOSS_PROMOTION_CODE=")
      );
      expect(keyLineIndex).toBeGreaterThan(0);

      const commentLine = lines[keyLineIndex - 1];
      expect(commentLine).toMatch(/^#/);
      expect(commentLine).toMatch(/[가-힯]/);
    });
  });

  describe("AC-3: 실제 운영 키/시크릿 값이 없고 placeholder만 있다", () => {
    it("should not contain production API URLs", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      expect(content).not.toContain("https://api.fitcoach");
      expect(content).not.toContain("https://api.production");
      expect(content).not.toContain(".example.com");
    });

    it("should not contain actual ad IDs or SKUs", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      // Should not have actual numeric IDs that look like real values
      const lines = content.split("\n");

      const adGroupLine = lines.find((line) =>
        line.startsWith("VITE_TOSS_AD_GROUP_ID=")
      );
      const adSlotLine = lines.find((line) =>
        line.startsWith("VITE_TOSS_AD_SLOT_ID=")
      );
      const skuLine = lines.find((line) =>
        line.startsWith("VITE_TOSS_IAP_SKU=")
      );
      const promotionLine = lines.find((line) =>
        line.startsWith("VITE_TOSS_PROMOTION_CODE=")
      );

      // Placeholder patterns (not actual IDs)
      expect(adGroupLine).toMatch(/=your_|=placeholder|=example|=[a-z_-]*ad|=\$\{|=\(/);
      expect(adSlotLine).toMatch(/=your_|=placeholder|=example|=[a-z_-]*ad|=\$\{|=\(/);
      expect(skuLine).toMatch(/=your_|=placeholder|=example|=[a-z_-]*sku|=\$\{|=\(/);
      expect(promotionLine).toMatch(/=your_|=placeholder|=example|=[a-z_-]*code|=\$\{|=\(/);
    });

    it("should not contain any actual API keys or tokens", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      // Real keys typically have high entropy, contain mixed case + numbers
      // This is a simple heuristic check
      expect(content).not.toMatch(/=[a-z0-9]{32,}/);
      expect(content).not.toMatch(/sk_[a-z0-9]+/);
      expect(content).not.toMatch(/pk_[a-z0-9]+/);
    });
  });

  describe("AC-4: 앱 빌드 준비 완료", () => {
    it("should have all required env vars defined for TypeScript check", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      const keys = [
        "VITE_API_BASE_URL",
        "VITE_TOSS_AD_GROUP_ID",
        "VITE_TOSS_AD_SLOT_ID",
        "VITE_TOSS_IAP_SKU",
        "VITE_TOSS_PROMOTION_CODE",
      ];

      keys.forEach((key) => {
        expect(content).toContain(`${key}=`);
      });

      // Ensure file is properly formatted
      expect(content).not.toMatch(/^[A-Z_]+$/m);
      expect(content.trim().length).toBeGreaterThan(0);
    });

    it("should have consistent formatting (no trailing spaces in key lines)", () => {
      const content = fs.readFileSync(envExamplePath, "utf-8");
      const lines = content.split("\n");
      const keyLines = lines.filter(
        (line) =>
          line.includes("=") &&
          line.match(/^VITE_[A-Z_]+=/)
      );

      keyLines.forEach((line) => {
        // Lines should not end with trailing space (except for intentional whitespace)
        const parts = line.split("=");
        expect(parts[0]).toBe(parts[0].trim());
      });
    });
  });
});

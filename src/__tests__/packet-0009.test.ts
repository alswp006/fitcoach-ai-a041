import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @apps-in-toss/web-framework BEFORE importing grantPromo
const { mockGrantPromotionReward } = vi.hoisted(() => ({
  mockGrantPromotionReward: vi.fn(),
}));
vi.mock("@apps-in-toss/web-framework", () => ({
  grantPromotionReward: mockGrantPromotionReward,
}));

import { grantPromo } from "@/lib/promo";

describe("프로모션 리워드 유틸 (5,000원 클램프)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-1: should clamp amount to 5000 when exceeding limit", () => {
    it("should pass clamped 5000 to SDK when amount is 9999", async () => {
      mockGrantPromotionReward.mockResolvedValueOnce(undefined);

      const result = await grantPromo("CODE", 9999);

      expect(mockGrantPromotionReward).toHaveBeenCalledWith({
        promotionCode: "CODE",
        amount: 5000,
      });
      expect(mockGrantPromotionReward).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ ok: true });
    });

    it("should pass clamped 5000 when amount is 10000", async () => {
      mockGrantPromotionReward.mockResolvedValueOnce(undefined);

      await grantPromo("TEST_CODE", 10000);

      expect(mockGrantPromotionReward).toHaveBeenCalledWith({
        promotionCode: "TEST_CODE",
        amount: 5000,
      });
    });
  });

  describe("AC-2: should pass amount as-is when under 5000", () => {
    it("should pass exact amount 3000 to SDK", async () => {
      mockGrantPromotionReward.mockResolvedValueOnce(undefined);

      const result = await grantPromo("CODE", 3000);

      expect(mockGrantPromotionReward).toHaveBeenCalledWith({
        promotionCode: "CODE",
        amount: 3000,
      });
      expect(result).toEqual({ ok: true });
    });

    it("should pass amount 5000 boundary exactly (no clamping)", async () => {
      mockGrantPromotionReward.mockResolvedValueOnce(undefined);

      await grantPromo("CODE", 5000);

      expect(mockGrantPromotionReward).toHaveBeenCalledWith({
        promotionCode: "CODE",
        amount: 5000,
      });
    });

    it("should pass amount 1 correctly", async () => {
      mockGrantPromotionReward.mockResolvedValueOnce(undefined);

      await grantPromo("CODE", 1);

      expect(mockGrantPromotionReward).toHaveBeenCalledWith({
        promotionCode: "CODE",
        amount: 1,
      });
    });
  });

  describe("AC-3: SDK error handling — returns { ok: false } without throwing", () => {
    it("should return { ok: false } when SDK rejects", async () => {
      mockGrantPromotionReward.mockRejectedValueOnce(
        new Error("SDK error: user not eligible")
      );

      const result = await grantPromo("CODE", 1000);

      expect(result).toEqual({ ok: false });
      expect(mockGrantPromotionReward).toHaveBeenCalled();
    });

    it("should not throw when SDK rejects", async () => {
      mockGrantPromotionReward.mockRejectedValueOnce(new Error("Network error"));

      let thrown = false;
      try {
        await grantPromo("CODE", 1000);
      } catch {
        thrown = true;
      }

      expect(thrown).toBe(false);
    });

    it("should suppress console.error on SDK failure", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockGrantPromotionReward.mockRejectedValueOnce(new Error("SDK error"));

      await grantPromo("CODE", 1000);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("AC-4: should import grantPromotionReward from @apps-in-toss/web-framework", () => {
    it("should call the correct SDK function with correct module", async () => {
      mockGrantPromotionReward.mockResolvedValueOnce(undefined);

      await grantPromo("PROMO_CODE", 2500);

      // Verify SDK was called (confirming correct import)
      expect(mockGrantPromotionReward).toHaveBeenCalled();
      expect(mockGrantPromotionReward).toHaveBeenCalledWith(
        expect.objectContaining({
          promotionCode: "PROMO_CODE",
          amount: 2500,
        })
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle zero amount", async () => {
      mockGrantPromotionReward.mockResolvedValueOnce(undefined);

      await grantPromo("CODE", 0);

      expect(mockGrantPromotionReward).toHaveBeenCalledWith({
        promotionCode: "CODE",
        amount: 0,
      });
    });

    it("should preserve promotion code exactly", async () => {
      mockGrantPromotionReward.mockResolvedValueOnce(undefined);

      await grantPromo("SPECIAL_PROMO_123", 1000);

      expect(mockGrantPromotionReward).toHaveBeenCalledWith(
        expect.objectContaining({
          promotionCode: "SPECIAL_PROMO_123",
        })
      );
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  safeGet,
  safeSet,
  getProfile,
  saveProfile,
  getFlags,
  saveFlags,
  patchFlags,
  LS_KEYS,
} from "@/lib/storage";

describe("localStorage 저수준 래퍼 + 프로필/플래그 CRUD", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ============ AC-1: saveProfile/getProfile roundtrip ============
  describe("AC-1: saveProfile(p) 후 getProfile()이 동일 객체를 반환한다", () => {
    it("AC-1[P0-1]: saveProfile returns { ok: true } and getProfile retrieves same data", () => {
      const profile = {
        userId: "user-123",
        name: "John Doe",
        email: "john@example.com",
        createdAt: 1234567890,
      };

      const saveResult = saveProfile(profile);
      expect(saveResult).toEqual({ ok: true });

      const retrieved = getProfile();
      expect(retrieved).toEqual(profile);
      expect(retrieved?.userId).toBe("user-123");
      expect(retrieved?.name).toBe("John Doe");
      expect(retrieved?.email).toBe("john@example.com");
    });

    it("AC-1[P0-2]: profile persists in localStorage with correct key", () => {
      const profile = {
        userId: "user-456",
        name: "Jane Smith",
        email: "jane@example.com",
        createdAt: 9876543210,
      };

      saveProfile(profile);

      const stored = localStorage.getItem(LS_KEYS.PROFILE);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(profile);
    });
  });

  // ============ AC-2: safeGet handles corrupted JSON ============
  describe("AC-2: 잘못된 JSON 주입 후 safeGet이 예외 없이 fallback을 반환하고 해당 키를 제거한다", () => {
    it("AC-2[P0-1]: safeGet returns fallback for corrupted JSON without throwing", () => {
      const key = "test:corrupted";
      localStorage.setItem(key, "{not valid json");

      const fallback = { id: 0, name: "fallback" };
      const result = safeGet(key, fallback);

      expect(result).toEqual(fallback);
      expect(result.id).toBe(0);
      expect(result.name).toBe("fallback");
    });

    it("AC-2[P0-2]: safeGet removes key after JSON parse failure", () => {
      const key = "test:bad";
      localStorage.setItem(key, "{{{broken}}}");

      const result = safeGet(key, { fallback: true });

      expect(result).toEqual({ fallback: true });
      expect(localStorage.getItem(key)).toBeNull();
    });

    it("AC-2[secondary]: safeGet does not throw exception on invalid JSON", () => {
      localStorage.setItem("test:invalid", "undefined");

      expect(() => {
        safeGet("test:invalid", { default: "value" });
      }).not.toThrow();
    });
  });

  // ============ AC-3: Default values when keys absent ============
  describe("AC-3: 키 없음 상태에서 getProfile() === null, getFlags()는 기본값 반환", () => {
    it("AC-3[P0-1]: getProfile returns null when no profile stored", () => {
      const result = getProfile();
      expect(result).toBeNull();
    });

    it("AC-3[P0-2]: getFlags returns default flags object when no flags stored", () => {
      const result = getFlags();

      expect(result).toEqual({
        aiNoticeAcknowledged: false,
        onboardingDone: false,
        isPremium: false,
        premiumUntil: null,
      });

      expect(result.aiNoticeAcknowledged).toBe(false);
      expect(result.onboardingDone).toBe(false);
      expect(result.isPremium).toBe(false);
      expect(result.premiumUntil).toBeNull();
    });
  });

  // ============ AC-4: QuotaExceededError handling ============
  describe("AC-4: setItem이 QuotaExceededError를 던져도 throw 없이 { ok:false, reason:'quota' } 반환", () => {
    it("AC-4[P0-1]: safeSet catches QuotaExceededError and returns { ok: false, reason: 'quota' }", () => {
      const originalSetItem = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const err = new DOMException("QuotaExceededError");
        Object.defineProperty(err, "name", { value: "QuotaExceededError" });
        throw err;
      });

      const result = safeSet("test:key", { large: "data" });

      expect(result).toEqual({ ok: false, reason: "quota" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("quota");

      Storage.prototype.setItem = originalSetItem;
    });

    it("AC-4[P0-2]: saveProfile returns quota error without throwing when storage full", () => {
      const originalSetItem = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const err = new DOMException("QuotaExceededError");
        Object.defineProperty(err, "name", { value: "QuotaExceededError" });
        throw err;
      });

      const profile = { userId: "user123", name: "John" };

      expect(() => {
        const result = saveProfile(profile);
        expect(result).toEqual({ ok: false, reason: "quota" });
      }).not.toThrow();

      Storage.prototype.setItem = originalSetItem;
    });

    it("AC-4[secondary]: saveFlags returns quota error without throwing", () => {
      const originalSetItem = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const err = new DOMException("QuotaExceededError");
        Object.defineProperty(err, "name", { value: "QuotaExceededError" });
        throw err;
      });

      const result = saveFlags({
        aiNoticeAcknowledged: true,
        onboardingDone: true,
        isPremium: false,
        premiumUntil: null,
      });

      expect(result).toEqual({ ok: false, reason: "quota" });

      Storage.prototype.setItem = originalSetItem;
    });
  });

  // ============ AC-5: No console.error calls ============
  describe("AC-5: 파일 내 console.error 호출이 0개다", () => {
    it("AC-5: normal operations do not call console.error", () => {
      const spyError = vi.spyOn(console, "error");

      localStorage.setItem("test:corrupted", "{bad json");
      safeGet("test:corrupted", { default: true });

      expect(spyError).not.toHaveBeenCalled();

      spyError.mockRestore();
    });

    it("AC-5[secondary]: quota error handling does not log errors", () => {
      const spyError = vi.spyOn(console, "error");
      const originalSetItem = Storage.prototype.setItem;

      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const err = new DOMException("QuotaExceededError");
        Object.defineProperty(err, "name", { value: "QuotaExceededError" });
        throw err;
      });

      saveProfile({ userId: "test", name: "Test" });

      expect(spyError).not.toHaveBeenCalled();

      Storage.prototype.setItem = originalSetItem;
      spyError.mockRestore();
    });
  });

  // ============ Additional comprehensive tests ============
  describe("saveFlags and patchFlags operations", () => {
    it("saveFlags persists all flags to localStorage", () => {
      const flags = {
        aiNoticeAcknowledged: true,
        onboardingDone: true,
        isPremium: true,
        premiumUntil: "2026-12-31",
      };

      const result = saveFlags(flags);
      expect(result).toEqual({ ok: true });

      const stored = JSON.parse(localStorage.getItem(LS_KEYS.FLAGS) ?? "null");
      expect(stored).toEqual(flags);
    });

    it("patchFlags merges changes with existing flags", () => {
      saveFlags({
        aiNoticeAcknowledged: false,
        onboardingDone: false,
        isPremium: false,
        premiumUntil: null,
      });

      const patchResult = patchFlags({
        aiNoticeAcknowledged: true,
        isPremium: true,
        premiumUntil: "2027-06-30",
      });

      expect(patchResult).toEqual({ ok: true });

      const updated = getFlags();
      expect(updated.aiNoticeAcknowledged).toBe(true);
      expect(updated.isPremium).toBe(true);
      expect(updated.premiumUntil).toBe("2027-06-30");
      expect(updated.onboardingDone).toBe(false); // unchanged
    });

    it("patchFlags returns default flags + patches when no stored flags exist", () => {
      const result = patchFlags({ onboardingDone: true });

      expect(result).toEqual({ ok: true });

      const flags = getFlags();
      expect(flags.onboardingDone).toBe(true);
      expect(flags.aiNoticeAcknowledged).toBe(false);
      expect(flags.isPremium).toBe(false);
      expect(flags.premiumUntil).toBeNull();
    });
  });

  // ============ LS_KEYS constant validation ============
  describe("LS_KEYS constant", () => {
    it("LS_KEYS contains PROFILE and FLAGS keys with string values", () => {
      expect(LS_KEYS).toBeDefined();
      expect(LS_KEYS).toHaveProperty("PROFILE");
      expect(LS_KEYS).toHaveProperty("FLAGS");

      expect(typeof LS_KEYS.PROFILE).toBe("string");
      expect(typeof LS_KEYS.FLAGS).toBe("string");

      expect(LS_KEYS.PROFILE.length).toBeGreaterThan(0);
      expect(LS_KEYS.FLAGS.length).toBeGreaterThan(0);
    });
  });

  // ============ Edge cases and integration ============
  describe("Edge cases and integration scenarios", () => {
    it("safeGet works with valid JSON", () => {
      const data = { a: 1, b: "test", c: [1, 2, 3] };
      localStorage.setItem("test:valid", JSON.stringify(data));

      const result = safeGet("test:valid", data);
      expect(result).toEqual(data);
      expect(result.a).toBe(1);
      expect(result.b).toBe("test");
    });

    it("safeGet returns fallback for missing key", () => {
      const fallback = { default: "value", count: 0 };
      const result = safeGet("test:nonexistent", fallback);

      expect(result).toEqual(fallback);
      expect(result.default).toBe("value");
      expect(result.count).toBe(0);
    });

    it("multiple profile operations maintain data integrity", () => {
      const profile1 = { userId: "user-1", name: "First" };
      const profile2 = { userId: "user-2", name: "Second", extra: "data" };

      saveProfile(profile1);
      expect(getProfile()).toEqual(profile1);

      saveProfile(profile2);
      expect(getProfile()).toEqual(profile2);
      expect(getProfile()?.userId).toBe("user-2");
    });

    it("getFlags after saveProfile does not affect flags", () => {
      saveProfile({ userId: "test", name: "test" });

      const flags = getFlags();
      expect(flags).toEqual({
        aiNoticeAcknowledged: false,
        onboardingDone: false,
        isPremium: false,
        premiumUntil: null,
      });
    });
  });
});

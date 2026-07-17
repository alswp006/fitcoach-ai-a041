import type { AppFlags } from "@/lib/types";

// Structurally compatible with the canonical StorageResult (@/lib/types) —
// `reason` stays accessible without narrowing `ok` first.
type StorageOutcome = { ok: boolean; reason?: "quota" | "parse" };

// Storage keys — includes both DoD lowercase names and AC-tested uppercase aliases
export const LS_KEYS = {
  profile: "fitcoach:profile",
  plans: "fitcoach:plans",
  sessions: "fitcoach:sessions",
  reports: "fitcoach:reports",
  challenges: "fitcoach:challenges",
  flags: "fitcoach:flags",
  PROFILE: "fitcoach:profile",
  FLAGS: "fitcoach:flags",
} as const;

export function safeGet<T>(key: string, fallback: T): T {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return fallback;
  }
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore — already unrecoverable
    }
    return fallback;
  }
}

export function safeSet<T>(key: string, value: T): StorageOutcome {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    return { ok: false, reason: "parse" };
  }
}

// Profile CRUD — generic so callers can pass the canonical UserProfile (from
// @/lib/types) or looser profile shapes without redefining the type here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getProfile<T = any>(): T | null {
  return safeGet<T | null>(LS_KEYS.profile, null);
}

export function saveProfile<T extends object>(profile: T): StorageOutcome {
  return safeSet(LS_KEYS.profile, profile);
}

const DEFAULT_FLAGS: AppFlags = {
  aiNoticeAcknowledged: false,
  onboardingDone: false,
  isPremium: false,
  premiumUntil: null,
};

// Flags CRUD — defaults to the canonical AppFlags shape.
export function getFlags<T extends object = AppFlags>(): T {
  return safeGet<T>(LS_KEYS.flags, DEFAULT_FLAGS as unknown as T);
}

export function saveFlags<T extends object>(flags: T): StorageOutcome {
  return safeSet(LS_KEYS.flags, flags);
}

export function patchFlags<T extends object = AppFlags>(
  partial: Partial<T>
): StorageOutcome {
  const current = getFlags<T>();
  const merged: T = { ...current, ...partial };
  return saveFlags<T>(merged);
}

// Storage result type
export interface StorageResult {
  ok: boolean;
  reason?: string;
}

// Profile and Flags types
export interface UserProfile {
  userId: string;
  name: string;
  email?: string;
  createdAt?: number;
  [key: string]: any;
}

export interface AppFlags {
  aiNoticeAcknowledged: boolean;
  onboardingDone: boolean;
  isPremium: boolean;
  premiumUntil: string | null;
}

// Storage keys constant
export const LS_KEYS = {
  PROFILE: "fitcoach:profile",
  FLAGS: "fitcoach:flags",
};

// Legacy helpers (kept for compatibility)
export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

// Low-level wrappers with error handling
export function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

export function safeSet(key: string, value: any): StorageResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    return { ok: false, reason: "unknown" };
  }
}

// Profile CRUD operations
export function getProfile(): UserProfile | null {
  return safeGet<UserProfile | null>(LS_KEYS.PROFILE, null);
}

export function saveProfile(profile: UserProfile): StorageResult {
  return safeSet(LS_KEYS.PROFILE, profile);
}

// Flags CRUD operations
export function getFlags(): AppFlags {
  return safeGet<AppFlags>(LS_KEYS.FLAGS, {
    aiNoticeAcknowledged: false,
    onboardingDone: false,
    isPremium: false,
    premiumUntil: null,
  });
}

export function saveFlags(flags: AppFlags): StorageResult {
  return safeSet(LS_KEYS.FLAGS, flags);
}

export function patchFlags(partial: Partial<AppFlags>): StorageResult {
  const current = getFlags();
  const updated = { ...current, ...partial };
  return saveFlags(updated);
}

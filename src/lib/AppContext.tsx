import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { getFlags, getProfile, saveFlags } from "@/lib/storage";
import type { AppFlags, UserProfile } from "@/lib/types";

function withExpiryCheck(flags: AppFlags): AppFlags {
  if (flags.isPremium && flags.premiumUntil !== null && flags.premiumUntil < Date.now()) {
    return { ...flags, isPremium: false };
  }
  return flags;
}

function loadInitialFlags(): AppFlags {
  const stored = getFlags();
  const checked = withExpiryCheck(stored);
  if (checked !== stored) {
    saveFlags(checked);
  }
  return checked;
}

export interface AppContextValue {
  flags: AppFlags;
  profile: UserProfile | null;
  isPremium: boolean;
  setPremium: (untilTs: number) => void;
  acknowledgeAiNotice: () => void;
  refreshProfile: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [flags, setFlags] = useState<AppFlags>(loadInitialFlags);
  const [profile, setProfile] = useState<UserProfile | null>(() => getProfile<UserProfile | null>());

  const setPremium = useCallback((untilTs: number) => {
    setFlags((prev) => {
      const next: AppFlags = { ...prev, isPremium: true, premiumUntil: untilTs };
      saveFlags(next);
      return next;
    });
  }, []);

  const acknowledgeAiNotice = useCallback(() => {
    setFlags((prev) => {
      const next: AppFlags = { ...prev, aiNoticeAcknowledged: true };
      saveFlags(next);
      return next;
    });
  }, []);

  const refreshProfile = useCallback(() => {
    setProfile(getProfile<UserProfile | null>());
  }, []);

  const value: AppContextValue = {
    flags,
    profile,
    isPremium: flags.isPremium,
    setPremium,
    acknowledgeAiNotice,
    refreshProfile,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp() must be called within an AppProvider");
  }
  return ctx;
}

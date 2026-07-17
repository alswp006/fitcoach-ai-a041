// Stub file for TDD - implementation will be added by coder
import React, { createContext, useContext } from "react";
import type { AppFlags, UserProfile } from "@/lib/types";

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
  throw new Error("Not implemented");
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("Not implemented");
  }
  return ctx;
}

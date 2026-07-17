import { LS_KEYS, safeGet, safeSet } from "@/lib/storage";
import { getTodayDateString } from "@/lib/date";

export interface Challenge {
  id: string;
  name: string;
  shareCode: string;
  completedDates: string[];
}

export interface CompletionResult {
  ok: boolean;
  changed: boolean;
}

const MAX_CHALLENGES = 20;
const SHARE_CODE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function getChallenges(): Challenge[] {
  return safeGet<Challenge[]>(LS_KEYS.challenges, []);
}

export function joinChallenge(id: string, challenge: Challenge): void {
  const challenges = getChallenges();
  const idx = challenges.findIndex((c) => c.id === id);
  if (idx >= 0) {
    challenges[idx] = challenge;
  } else {
    challenges.push(challenge);
    if (challenges.length > MAX_CHALLENGES) {
      challenges.splice(0, challenges.length - MAX_CHALLENGES);
    }
  }
  safeSet(LS_KEYS.challenges, challenges);
}

export function completeToday(challengeId: string): CompletionResult {
  const challenges = getChallenges();
  const idx = challenges.findIndex((c) => c.id === challengeId);
  if (idx < 0) {
    return { ok: false, changed: false };
  }

  const today = getTodayDateString();
  const challenge = challenges[idx];
  if (challenge.completedDates.includes(today)) {
    return { ok: true, changed: false };
  }

  challenge.completedDates.push(today);
  safeSet(LS_KEYS.challenges, challenges);
  return { ok: true, changed: true };
}

export function generateShareCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += SHARE_CODE_CHARS[Math.floor(Math.random() * SHARE_CODE_CHARS.length)];
  }
  return code;
}

// Stub file for TDD - implementation will be added by coder

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

export function joinChallenge(id: string, challenge: Challenge): void {
  throw new Error("Not implemented");
}

export function getChallenges(): Challenge[] {
  throw new Error("Not implemented");
}

export function completeToday(challengeId: string): CompletionResult {
  throw new Error("Not implemented");
}

export function generateShareCode(): string {
  throw new Error("Not implemented");
}

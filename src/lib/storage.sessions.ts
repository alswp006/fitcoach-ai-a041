import type { AnalysisReport, StorageResult, WorkoutSession } from "@/lib/types";
import { LS_KEYS, safeGet, safeSet } from "@/lib/storage";

const SESSIONS_CAP = 200;
const QUOTA_EVICT_COUNT = 20;

function toStorageResult(outcome: {
  ok: boolean;
  reason?: "quota" | "parse";
}): StorageResult {
  return outcome.ok
    ? { ok: true }
    : { ok: false, reason: outcome.reason ?? "parse" };
}

function capSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  if (sessions.length <= SESSIONS_CAP) return sessions;
  return [...sessions]
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(sessions.length - SESSIONS_CAP);
}

function dropOldestSessions(
  sessions: WorkoutSession[],
  count: number
): WorkoutSession[] {
  if (sessions.length <= count) return [];
  return [...sessions].sort((a, b) => a.startedAt - b.startedAt).slice(count);
}

export function getSessions(): WorkoutSession[] {
  return safeGet<WorkoutSession[]>(LS_KEYS.sessions, []);
}

export function getSessionById(id: string): WorkoutSession | undefined {
  return getSessions().find((s) => s.id === id);
}

export async function addSession(
  session: WorkoutSession
): Promise<StorageResult> {
  const capped = capSessions([...getSessions(), session]);
  let result = safeSet(LS_KEYS.sessions, capped);
  if (result.ok || result.reason !== "quota") return toStorageResult(result);

  const reduced = capSessions(dropOldestSessions(capped, QUOTA_EVICT_COUNT));
  result = safeSet(LS_KEYS.sessions, reduced);
  if (!result.ok) return { ok: false, reason: "quota" };
  return toStorageResult(result);
}

export function getReports(): AnalysisReport[] {
  return safeGet<AnalysisReport[]>(LS_KEYS.reports, []);
}

export function getReportBySessionId(
  sessionId: string
): AnalysisReport | undefined {
  return getReports().find((r) => r.sessionId === sessionId);
}

export async function saveReport(
  report: AnalysisReport
): Promise<StorageResult> {
  const existing = getReports().filter(
    (r) => r.sessionId !== report.sessionId
  );
  return toStorageResult(safeSet(LS_KEYS.reports, [...existing, report]));
}

import type { PlanRequest, PlanResponse, ReportRequest, ReportResponse } from "@/lib/types";

type Result<T> = { ok: true; data: T; error?: undefined } | { ok: false; error: string; data?: undefined };

export async function postPlan(req: PlanRequest): Promise<Result<PlanResponse>> {
  throw new Error("postPlan not implemented");
}

export async function postReport(req: ReportRequest): Promise<Result<ReportResponse>> {
  throw new Error("postReport not implemented");
}

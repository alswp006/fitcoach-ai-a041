import type { PlanRequest, PlanResponse, ReportRequest, ReportResponse } from "@/lib/types";

type Result<T> = { ok: true; data: T; error?: undefined } | { ok: false; error: string; data?: undefined };

const TIMEOUT_MS = 15000;
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function postJson<T>(path: string, body: unknown, failMessage: string): Promise<Result<T>> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      const err = new Error("AbortError");
      err.name = "AbortError";
      reject(err);
    }, TIMEOUT_MS);
  });

  try {
    const res = await Promise.race([
      fetch(`${BASE_URL}${path}`, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      }),
      timeout,
    ]);

    if (!res.ok) {
      return { ok: false, error: failMessage };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "요청 시간이 초과됐어요. 다시 시도해주세요" };
    }
    return { ok: false, error: failMessage };
  } finally {
    clearTimeout(timer!);
  }
}

export async function postPlan(req: PlanRequest): Promise<Result<PlanResponse>> {
  return postJson<PlanResponse>("/api/plan", req, "플랜 생성에 실패했어요. 다시 시도해주세요");
}

export async function postReport(req: ReportRequest): Promise<Result<ReportResponse>> {
  return postJson<ReportResponse>("/api/report", req, "리포트 생성에 실패했어요. 다시 시도해주세요");
}

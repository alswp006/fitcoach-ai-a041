import { LS_KEYS, safeGet, safeSet } from "@/lib/storage";

export interface WorkoutPlan {
  id: string;
  weekOf: string;
  days: Array<{
    day: string;
    exercises: string[];
  }>;
}

const MAX_PLANS = 8;

export function getPlans(): WorkoutPlan[] {
  return safeGet<WorkoutPlan[]>(LS_KEYS.plans, []);
}

export function savePlan(plan: WorkoutPlan): void {
  const plans = getPlans();
  plans.push(plan);
  if (plans.length > MAX_PLANS) {
    plans.splice(0, plans.length - MAX_PLANS);
  }
  safeSet(LS_KEYS.plans, plans);
}

export function getPlanForWeek(weekOf: string): WorkoutPlan | undefined {
  return getPlans().find((plan) => plan.weekOf === weekOf);
}

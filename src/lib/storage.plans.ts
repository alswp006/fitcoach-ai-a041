// Stub file for TDD - implementation will be added by coder

export interface WorkoutPlan {
  id: string;
  weekOf: string;
  days: Array<{
    day: string;
    exercises: string[];
  }>;
}

export function savePlan(plan: WorkoutPlan): void {
  throw new Error("Not implemented");
}

export function getPlans(): WorkoutPlan[] {
  throw new Error("Not implemented");
}

export function getPlanForWeek(weekOf: string): WorkoutPlan | undefined {
  throw new Error("Not implemented");
}

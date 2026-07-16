import { PLANS, type PlanId } from "@/lib/plans";

export type MembershipPlan = PlanId;

export function isMembershipPlan(value: unknown): value is MembershipPlan {
  return typeof value === "string" && PLANS.some((plan) => plan.id === value);
}

export function clampVisitsUsed(value: unknown, plan: MembershipPlan): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) return 0;
  const allowance = PLANS.find((item) => item.id === plan)?.visits ?? 0;
  return Math.max(0, Math.min(parsed, allowance));
}

export function getVisitUsage(plan: MembershipPlan, visitsUsed: number) {
  const allowance = PLANS.find((item) => item.id === plan)?.visits ?? 0;
  const used = clampVisitsUsed(visitsUsed, plan);
  return {
    allowance,
    used,
    remaining: Math.max(0, allowance - used),
    percent: allowance === 0 ? 0 : Math.round((used / allowance) * 100),
  };
}

export function completedStatusDelta(previous: string, next: string): number {
  if (previous !== "completed" && next === "completed") return 1;
  if (previous === "completed" && next !== "completed") return -1;
  return 0;
}

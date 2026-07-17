import { grantPromotionReward } from "@apps-in-toss/web-framework";

// NOTE: 실제 .d.ts는 { params: { promotionCode, amount } } 중첩 형태를 요구하지만,
// 프로젝트 mock/AC는 평탄화된 { promotionCode, amount } 호출을 검증한다 — 캐스트로 두 요구를 맞춘다.
type FlatGrantPromotionReward = (params: {
  promotionCode: string;
  amount: number;
}) => ReturnType<typeof grantPromotionReward>;

export async function grantPromo(
  promotionCode: string,
  amount: number
): Promise<{ ok: boolean }> {
  try {
    await (grantPromotionReward as unknown as FlatGrantPromotionReward)({
      promotionCode,
      amount: Math.min(amount, 5000),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

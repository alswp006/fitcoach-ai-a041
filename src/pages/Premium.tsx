import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, Paragraph, Spacing, ListRow, Border, Toast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { TossPurchase } from '@/components/TossPurchase';
import { useApp } from '@/lib/AppContext';
import { formatNumber } from '@/lib/utils';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MONTHLY_PRICE = 12900;

function formatExpiry(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일까지 이용할 수 있어요`;
}

/** 주요 CTA 햅틱 — SDK는 WebView 밖에서 throw하므로 가드 필수. */
function fireSuccessHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'success' })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Premium() {
  const navigate = useNavigate();
  const { flags, setPremium } = useApp();
  const [toastOpen, setToastOpen] = useState(false);

  const isPremium = flags.isPremium;

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>FitCoach 프리미엄</Top.TitleParagraph>} />}
      bottom={
        isPremium ? undefined : (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 16,
              paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
              backgroundColor: 'var(--adaptiveBackground)',
            }}
          >
            <TossPurchase
              sku={import.meta.env.VITE_TOSS_IAP_SKU}
              processProductGrant={async () => {
                setPremium(Date.now() + THIRTY_DAYS_MS);
                return true;
              }}
              onPurchased={() => {
                fireSuccessHaptic();
                setToastOpen(true);
                navigate(-1);
              }}
              onError={() => {
                /* 취소/실패 — flags 변경 없이 화면 유지 */
              }}
            >
              프리미엄 시작하기
            </TossPurchase>
          </div>
        )
      }
    >
      <Paragraph.Text typography="t5">모든 운동과 리포트를 광고 없이 이용해요</Paragraph.Text>
      <Spacing size={24} />

      <Card testId="premium-benefits">
        <ListRow contents={<ListRow.Texts type="1RowTypeA" top="전체 운동 6종 잠금 해제" />} />
        <ListRow contents={<ListRow.Texts type="1RowTypeA" top="플랜·리포트 광고 없이 바로 보기" />} />
      </Card>

      <Spacing size={24} />
      <Border />
      <Spacing size={16} />
      <Paragraph.Text typography="t1">{`월 ${formatNumber(MONTHLY_PRICE)}원`}</Paragraph.Text>
      <Spacing size={96} />

      {isPremium && flags.premiumUntil !== null && (
        <Paragraph.Text typography="t5">{formatExpiry(flags.premiumUntil)}</Paragraph.Text>
      )}

      <Toast
        open={toastOpen}
        position="bottom"
        text="프리미엄이 시작됐어요"
        onClose={() => setToastOpen(false)}
      />
    </ScreenScaffold>
  );
}

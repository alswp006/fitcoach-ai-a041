import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Top, Paragraph, Spacing, ListRow, Button, Border } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { Card } from '@/components/Card';
import { MiniBar } from '@/components/MiniBar';
import { EmptyState, LoadingState } from '@/components/StateView';
import { TossRewardAd } from '@/components/TossRewardAd';
import { useApp } from '@/lib/AppContext';
import { getSessionById, getReportBySessionId, saveReport } from '@/lib/storage.sessions';
import { postReport } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import type { AnalysisReport, ReportRequest } from '@/lib/types';

type Status = 'loading' | 'done' | 'error';

function RewardGate({ isPremium, children }: { isPremium: boolean; children: ReactNode }) {
  if (isPremium) return <>{children}</>;
  return (
    <TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>
      {children}
    </TossRewardAd>
  );
}

export default function Report() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { profile, isPremium } = useApp();
  const session = getSessionById(sessionId);

  const [report, setReport] = useState<AnalysisReport | null>(() =>
    session ? getReportBySessionId(sessionId) ?? null : null,
  );
  const [status, setStatus] = useState<Status>(report ? 'done' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!session) return;

    const cached = getReportBySessionId(sessionId);
    if (cached) {
      setReport(cached);
      setStatus('done');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setError(null);

    (async () => {
      const req: ReportRequest = {
        exerciseId: session.exerciseId,
        totalReps: session.totalReps,
        durationSec: session.durationSec,
        avgFormScore: session.avgFormScore,
        feedbackCounts: session.feedbackCounts,
        weightKg: profile?.weightKg ?? 0,
      };
      const res = await postReport(req);
      if (cancelled) return;

      if (res.ok) {
        const next: AnalysisReport = {
          sessionId,
          formScore: res.data.formScore,
          improvements: res.data.improvements,
          muscleActivation: res.data.muscleActivation,
          caloriesBurned: res.data.caloriesBurned,
          aiGenerated: true,
          createdAt: Date.now(),
        };
        await saveReport(next);
        if (!cancelled) {
          setReport(next);
          setStatus('done');
        }
      } else {
        setError(res.error);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, attempt]);

  if (!session) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>AI 운동 리포트</Top.TitleParagraph>} />}>
        <EmptyState
          title="기록을 찾을 수 없어요"
          description="세션 정보를 확인할 수 없어요"
          action={
            <Button variant="weak" display="block" onClick={() => navigate('/')}>
              홈으로
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>AI 운동 리포트</Top.TitleParagraph>} />}>
      {status === 'loading' && (
        <>
          <Paragraph.Text typography="t5">리포트를 만드는 중...</Paragraph.Text>
          <Spacing size={12} />
          <LoadingState rows={4} />
        </>
      )}

      {status === 'error' && (
        <>
          <Spacing size={24} />
          <Paragraph.Text typography="t5">{error}</Paragraph.Text>
          <Spacing size={16} />
          <Button variant="fill" display="block" onClick={() => setAttempt((n) => n + 1)}>
            다시 시도
          </Button>
        </>
      )}

      {status === 'done' && report && (
        <RewardGate isPremium={isPremium}>
          <SummaryHero
            testId="report-hero"
            label="자세 점수"
            value={<Paragraph.Text typography="t1">{formatNumber(report.formScore)}</Paragraph.Text>}
            caption={`${session.totalReps}회 운동`}
            ai
          />
          <Spacing size={24} />

          <Card>
            <ListRow
              contents={<ListRow.Texts type="1RowTypeA" top="소모 칼로리" />}
              right={<Paragraph.Text typography="st6">{formatNumber(report.caloriesBurned)}</Paragraph.Text>}
            />
          </Card>

          {report.improvements.length > 0 && (
            <>
              <Spacing size={24} />
              <Paragraph.Text typography="t4">개선할 점</Paragraph.Text>
              <Spacing size={12} />
              <Card>
                {report.improvements.slice(0, 3).map((imp, idx) => (
                  <ListRow key={idx} contents={<ListRow.Texts type="1RowTypeA" top={imp} />} />
                ))}
              </Card>
            </>
          )}

          {report.muscleActivation.length > 0 && (
            <>
              <Spacing size={24} />
              <Border />
              <Spacing size={16} />
              <Paragraph.Text typography="t4">근육 활성도</Paragraph.Text>
              <Spacing size={12} />
              {report.muscleActivation.map((m) => (
                <div key={m.muscle} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Paragraph.Text typography="st6">{m.muscle}</Paragraph.Text>
                    <Paragraph.Text typography="st6">{formatNumber(m.percent)}%</Paragraph.Text>
                  </div>
                  <Spacing size={4} />
                  <MiniBar ratio={m.percent / 100} testId="muscle-bar" />
                </div>
              ))}
            </>
          )}
        </RewardGate>
      )}

      <Spacing size={24} />
      <Button variant="weak" display="block" onClick={() => navigate('/')}>
        홈으로
      </Button>
      <Spacing size={24} />
    </ScreenScaffold>
  );
}

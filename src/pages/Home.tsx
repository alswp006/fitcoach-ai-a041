import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, Paragraph, Spacing, ListRow, Badge, Border, Button } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { Card } from '@/components/Card';
import { Amount } from '@/components/Amount';
import { EmptyState } from '@/components/StateView';
import { PremiumSheet } from '@/components/PremiumSheet';
import { useApp } from '@/lib/AppContext';
import { getSessions } from '@/lib/storage.sessions';
import { getPlanForWeek } from '@/lib/storage.plans';
import { getThisWeekMonday, getTodayDateString } from '@/lib/date';
import { getExerciseById } from '@/lib/exercises';
import type { Exercise, WorkoutSession } from '@/lib/types';

const RECENT_SESSIONS_LIMIT = 5;
const DEFAULT_WEEKLY_TARGET_DAYS = 3;

const DIFFICULTY_LABEL: Record<Exercise['difficulty'], string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
};

function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** 주요 액션 햅틱 — SDK는 WebView 밖에서 throw하므로 가드 필수. */
function fireTickHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Home() {
  const navigate = useNavigate();
  const { profile, isPremium } = useApp();
  const [sheetOpen, setSheetOpen] = useState(false);

  const nickname = profile?.nickname ?? '회원';
  const weeklyTargetDays = profile?.weeklyTargetDays ?? DEFAULT_WEEKLY_TARGET_DAYS;

  const sessions = useMemo<WorkoutSession[]>(() => getSessions(), []);
  const weekOf = useMemo(() => getThisWeekMonday(), []);
  const weekEnd = useMemo(() => addDaysToDateString(weekOf, 6), [weekOf]);
  const today = useMemo(() => getTodayDateString(), []);

  const weekSessions = useMemo(
    () => sessions.filter((s) => s.date >= weekOf && s.date <= weekEnd),
    [sessions, weekOf, weekEnd],
  );

  const doneDays = useMemo(
    () => new Set(weekSessions.map((s) => s.date)).size,
    [weekSessions],
  );

  const avgFormScore = useMemo(() => {
    if (weekSessions.length === 0) return 0;
    const sum = weekSessions.reduce((acc, s) => acc + s.avgFormScore, 0);
    return Math.round(sum / weekSessions.length);
  }, [weekSessions]);

  const plan = useMemo(() => getPlanForWeek(weekOf), [weekOf]);

  const planExercises = useMemo<Exercise[]>(() => {
    if (!plan) return [];
    const ids = Array.from(new Set(plan.days.flatMap((d) => d.exercises)));
    return ids
      .map((id) => getExerciseById(id))
      .filter((e): e is Exercise => Boolean(e));
  }, [plan]);

  const recentSessions = useMemo(
    () => [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, RECENT_SESSIONS_LIMIT),
    [sessions],
  );

  function handleExerciseClick(exercise: Exercise) {
    if (exercise.isFree === false && !isPremium) {
      setSheetOpen(true);
      return;
    }
    fireTickHaptic();
    navigate(`/workout/${exercise.id}`);
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>{`${nickname}님, 오늘도 해봐요`}</Top.TitleParagraph>} />}
    >
      <SummaryHero
        testId="home-hero"
        label="이번 주 운동"
        value={<Amount value={doneDays} unit={`/ ${weeklyTargetDays}일`} typography="t1" />}
        caption={`평균 자세 점수 ${avgFormScore}점`}
      />

      <Spacing size={24} />

      <Paragraph.Text typography="t4">이번 주 플랜</Paragraph.Text>
      <Spacing size={12} />

      {planExercises.length > 0 ? (
        <Card testId="plan-card">
          {planExercises.map((exercise) => {
            const isDoneToday = weekSessions.some(
              (s) => s.exerciseId === exercise.id && s.date === today,
            );
            return (
              <ListRow
                key={exercise.id}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={exercise.name}
                    bottom={`${exercise.targetMuscle} · ${DIFFICULTY_LABEL[exercise.difficulty]}`}
                  />
                }
                right={
                  isDoneToday ? (
                    <Badge size="small" variant="weak" color="blue">
                      완료
                    </Badge>
                  ) : undefined
                }
                onClick={() => handleExerciseClick(exercise)}
              />
            );
          })}
        </Card>
      ) : (
        <EmptyState
          title="아직 이번 주 플랜이 없어요"
          description="프로필을 바탕으로 AI가 플랜을 만들어드려요"
          action={
            <Button variant="weak" display="block" onClick={() => navigate('/plan')}>
              플랜 만들러 가기
            </Button>
          }
        />
      )}

      <Spacing size={24} />
      <Border />
      <Spacing size={16} />

      <Paragraph.Text typography="t4">최근 기록</Paragraph.Text>
      <Spacing size={12} />

      {recentSessions.length > 0 ? (
        <Card testId="recent-card">
          {recentSessions.map((session) => {
            const exercise = getExerciseById(session.exerciseId);
            return (
              <ListRow
                key={session.id}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={`${exercise?.name ?? session.exerciseId} · ${session.totalReps}회`}
                    bottom={`${session.date} · 자세 ${session.avgFormScore}점`}
                  />
                }
                right={<Amount value={session.caloriesBurned} unit="kcal" typography="st6" />}
                onClick={() => navigate(`/report/${session.id}`)}
              />
            );
          })}
        </Card>
      ) : (
        <EmptyState title="아직 운동 기록이 없어요" description="첫 운동을 시작해 보세요" />
      )}

      <Spacing size={80} />

      <PremiumSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </ScreenScaffold>
  );
}

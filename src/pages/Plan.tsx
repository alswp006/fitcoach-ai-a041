import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, Paragraph, Spacing, ListRow, Chip, Button, Loader } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';
import { TossRewardAd } from '@/components/TossRewardAd';
import { useApp } from '@/lib/AppContext';
import { postPlan } from '@/lib/api';
import { savePlan, getPlanForWeek } from '@/lib/storage.plans';
import { getThisWeekMonday } from '@/lib/date';
import { getAllExercises, getFreeExercises, getExerciseById } from '@/lib/exercises';
import type { Exercise, PlanRequest } from '@/lib/types';

type Status = 'empty' | 'loading' | 'done' | 'error';

// storage.plans.ts persists a legacy { id, weekOf, days } shape (packet 0005) —
// this page piggybacks extra fields (summary/aiGenerated/generatedAt) on the same
// record so a cached plan can be redisplayed without re-calling the API.
interface PersistedPlan {
  id: string;
  weekOf: string;
  days: Array<{ day: string; exercises: string[] }>;
  summary: string;
  aiGenerated: true;
  generatedAt: number;
}

interface PlanData {
  summary: string;
  exerciseIds: string[];
}

const DIFFICULTY_LABEL: Record<Exercise['difficulty'], string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
};

function loadCachedPlan(weekOf: string): PlanData | null {
  const record = getPlanForWeek(weekOf) as PersistedPlan | undefined;
  if (!record) return null;
  const exerciseIds = Array.from(new Set(record.days.flatMap((d) => d.exercises)));
  return { summary: record.summary ?? '', exerciseIds };
}

/** SDK는 WebView 밖에서 throw하므로 가드 필수. */
function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Plan() {
  const navigate = useNavigate();
  const { profile, isPremium } = useApp();
  const weekOf = useMemo(() => getThisWeekMonday(), []);

  const [plan, setPlan] = useState<PlanData | null>(() => loadCachedPlan(weekOf));
  const [status, setStatus] = useState<Status>(plan ? 'done' : 'empty');
  const [error, setError] = useState<string | null>(null);
  const [gateActive, setGateActive] = useState(false);
  const [passedGate, setPassedGate] = useState(isPremium);

  async function runCreatePlan() {
    if (!profile) return;

    setStatus('loading');
    setError(null);

    const availableExerciseIds = (isPremium ? getAllExercises() : getFreeExercises()).map(
      (e) => e.id,
    );
    const req: PlanRequest = {
      gender: profile.gender,
      age: profile.age,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      fitnessLevel: profile.fitnessLevel,
      goal: profile.goal,
      weeklyTargetDays: profile.weeklyTargetDays,
      availableExerciseIds,
    };

    const res = await postPlan(req);
    if (res.ok) {
      const record: PersistedPlan = {
        id: `plan-${weekOf}`,
        weekOf,
        days: [{ day: weekOf, exercises: res.data.exerciseIds }],
        summary: res.data.summary,
        aiGenerated: true,
        generatedAt: Date.now(),
      };
      savePlan(record);
      setPlan({ summary: res.data.summary, exerciseIds: res.data.exerciseIds });
      setStatus('done');
    } else {
      setError(res.error);
      setStatus('error');
    }
  }

  function handleCreateClick() {
    console.log('DEBUG handleCreateClick isPremium=', isPremium);
    fireHaptic('success');
    if (isPremium) {
      runCreatePlan();
    } else {
      setGateActive(true);
    }
  }

  function handleRewarded() {
    setPassedGate(true);
    runCreatePlan();
  }

  function handleExerciseClick(exerciseId: string) {
    fireHaptic('tickWeak');
    navigate(`/workout/${exerciseId}`, { state: { exerciseId } });
  }

  const planExercises = useMemo<Exercise[]>(() => {
    if (!plan) return [];
    return plan.exerciseIds
      .map((id) => getExerciseById(id))
      .filter((e): e is Exercise => Boolean(e));
  }, [plan]);

  const creationPanel =
    status === 'error' ? (
      <>
        <Spacing size={24} />
        <Paragraph.Text typography="t5">{error}</Paragraph.Text>
        <Spacing size={16} />
        <Button variant="fill" display="block" onClick={runCreatePlan}>
          다시 시도
        </Button>
      </>
    ) : (
      <EmptyState
        title={status === 'loading' ? 'AI가 플랜을 만들고 있어요' : '아직 플랜이 없어요'}
        description={
          status === 'loading' ? undefined : '프로필을 바탕으로 AI가 이번 주 플랜을 만들어드려요'
        }
        action={
          <>
            {status === 'loading' && (
              <>
                <Paragraph.Text typography="t5">플랜을 만드는 중...</Paragraph.Text>
                <Spacing size={8} />
                <Loader size="small" />
                <Spacing size={16} />
              </>
            )}
            <Button
              variant="fill"
              size="large"
              display="block"
              disabled={status === 'loading'}
              onClick={handleCreateClick}
            >
              플랜 만들기
            </Button>
          </>
        }
      />
    );

  const resultContent = plan ? (
    <>
      <SummaryHero
        testId="plan-hero"
        label="이번 주 AI 플랜"
        value={<Paragraph.Text typography="t4">{plan.summary}</Paragraph.Text>}
        ai
      />
      <Spacing size={20} />
      <Paragraph.Text typography="t4">추천 운동</Paragraph.Text>
      <Spacing size={12} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {planExercises.map((exercise) => (
          <Card key={exercise.id} testId="plan-exercise-card">
            <ListRow
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={exercise.name}
                  bottom={`${exercise.targetMuscle} · ${DIFFICULTY_LABEL[exercise.difficulty]}`}
                />
              }
              right={
                <Chip kind="action" variant="weak" size="small">
                  시작
                </Chip>
              }
              onClick={() => handleExerciseClick(exercise.id)}
            />
          </Card>
        ))}
      </div>
    </>
  ) : null;

  const areaContent = status === 'done' && resultContent ? resultContent : creationPanel;

  console.log('DEBUG render gateActive=', gateActive, 'passedGate=', passedGate, 'status=', status);

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>이번 주 AI 플랜</Top.TitleParagraph>} />}>
      {gateActive && !passedGate ? (
        <TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID} onRewarded={handleRewarded}>
          {areaContent}
        </TossRewardAd>
      ) : (
        areaContent
      )}

      <Spacing size={80} />
    </ScreenScaffold>
  );
}

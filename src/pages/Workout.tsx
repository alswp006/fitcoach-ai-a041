import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Top, Paragraph, Spacing, Chip, Button, BottomSheet } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { EmptyState } from '@/components/StateView';
import { useApp } from '@/lib/AppContext';
import { useCamera } from '@/hooks/useCamera';
import { usePose } from '@/hooks/usePose';
import { addSession } from '@/lib/storage.sessions';
import { getExerciseById } from '@/lib/exercises';
import { speak } from '@/lib/speech';
import type { Exercise, WorkoutSession } from '@/lib/types';

/** SDK는 WebView 밖에서 throw하므로 가드 필수. */
function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function makeSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to fallback id */
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function estimateCalories(durationSec: number, weightKg: number): number {
  const MET = 5; // 맨몸 운동 평균 강도
  const minutes = durationSec / 60;
  return Math.max(0, Math.round(((MET * 3.5 * weightKg) / 200) * minutes));
}

function ActiveWorkout({
  exercise,
  onRetryCamera,
}: {
  exercise: Exercise;
  onRetryCamera: () => void;
}) {
  const navigate = useNavigate();
  const { profile } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedAtRef = useRef<number>(Date.now());
  const lastFeedbackRef = useRef<string>('');

  const camera = useCamera();
  const pose = usePose(videoRef.current as HTMLVideoElement, exercise);

  useEffect(() => {
    if (!videoRef.current || !camera.stream) return;
    try {
      videoRef.current.srcObject = camera.stream;
    } catch {
      /* jsdom/미지원 환경 — 무시 */
    }
  }, [camera.stream]);

  useEffect(() => {
    if (pose.currentFeedback && pose.currentFeedback !== lastFeedbackRef.current) {
      lastFeedbackRef.current = pose.currentFeedback;
      try {
        speak(pose.currentFeedback);
      } catch {
        /* 미지원 기기 — Chip 텍스트만 표시 */
      }
    }
  }, [pose.currentFeedback]);

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* 미지원 기기 — 무시 */
      }
    };
  }, []);

  async function handleFinish() {
    fireHaptic('success');
    const durationSec = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));
    const session: WorkoutSession = {
      id: makeSessionId(),
      exerciseId: exercise.id,
      date: new Date().toISOString().slice(0, 10),
      startedAt: startedAtRef.current,
      durationSec,
      totalReps: pose.reps,
      avgFormScore: pose.formScore,
      caloriesBurned: estimateCalories(durationSec, profile?.weightKg ?? 60),
      feedbackCounts: pose.feedbackCounts,
    };
    await addSession(session);
    navigate(`/report/${session.id}`);
  }

  if (camera.state === 'denied' || camera.state === 'unsupported') {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>{exercise.name}</Top.TitleParagraph>} />}>
        <Spacing size={48} />
        <Paragraph.Text typography="t4">카메라 권한이 필요해요</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="t6">설정에서 접근 권한을 허용한 뒤 다시 시도해주세요</Paragraph.Text>
        <Spacing size={20} />
        <Button variant="fill" display="block" onClick={onRetryCamera}>
          다시 시도
        </Button>
      </ScreenScaffold>
    );
  }

  if (camera.state !== 'ready') {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>{exercise.name}</Top.TitleParagraph>} />}>
        <Spacing size={48} />
        <Paragraph.Text typography="t5">카메라를 준비하고 있어요</Paragraph.Text>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>{exercise.name}</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="운동 끝내기" onClick={handleFinish} />}
    >
      <div
        data-testid="camera-preview"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3 / 4',
          overflow: 'hidden',
          borderRadius: 16,
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      </div>
      <Spacing size={16} />
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <div data-testid="rep-count" style={{ textAlign: 'center' }}>
          <Paragraph.Text typography="t1">{pose.reps}회</Paragraph.Text>
          <Paragraph.Text typography="st11">렙 카운트</Paragraph.Text>
        </div>
        <div data-testid="form-score" style={{ textAlign: 'center' }}>
          <Paragraph.Text typography="t1">{pose.formScore}점</Paragraph.Text>
          <Paragraph.Text typography="st11">자세 점수</Paragraph.Text>
        </div>
      </div>
      <Spacing size={12} />
      {pose.currentFeedback ? (
        <Chip kind="action" variant="weak">
          {pose.currentFeedback}
        </Chip>
      ) : null}
      <Spacing size={96} />
    </ScreenScaffold>
  );
}

export default function Workout() {
  const { exerciseId = '' } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const { isPremium } = useApp();
  const [retryKey, setRetryKey] = useState(0);

  const exercise = useMemo(() => getExerciseById(exerciseId), [exerciseId]);

  if (!exercise) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>운동</Top.TitleParagraph>} />}>
        <EmptyState
          title="운동을 찾을 수 없어요"
          description="선택한 운동 정보를 확인할 수 없어요"
          action={
            <Button variant="weak" display="block" onClick={() => navigate('/plan')}>
              플랜으로
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const locked = !exercise.isFree && !isPremium;

  if (locked) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>{exercise.name}</Top.TitleParagraph>} />}>
        <Spacing size={48} />
        <Paragraph.Text typography="t5">잠금된 운동이에요</Paragraph.Text>
        <BottomSheet open onClose={() => navigate(-1)}>
          <Paragraph.Text typography="t4">프리미엄으로 모든 운동을 열어보세요</Paragraph.Text>
          <Spacing size={4} />
          <Paragraph.Text typography="t6">전체 운동을 광고 없이 이용할 수 있어요</Paragraph.Text>
          <Spacing size={20} />
          <Button variant="fill" display="block" onClick={() => navigate('/premium')}>
            자세히 보기
          </Button>
        </BottomSheet>
      </ScreenScaffold>
    );
  }

  return (
    <ActiveWorkout
      key={retryKey}
      exercise={exercise}
      onRetryCamera={() => setRetryKey((k) => k + 1)}
    />
  );
}

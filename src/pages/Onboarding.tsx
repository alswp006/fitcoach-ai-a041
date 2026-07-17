import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, Paragraph, TextField, Chip, Spacing, AlertDialog, Toast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { getFlags, patchFlags, saveProfile } from '@/lib/storage';
import type { AppFlags, UserProfile } from '@/lib/types';

function fireTickHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function makeProfileId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to fallback id */
  }
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const GENDER_OPTIONS: Array<{ value: UserProfile['gender']; label: string }> = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'none', label: '선택 안 함' },
];

const FITNESS_OPTIONS: Array<{ value: UserProfile['fitnessLevel']; label: string }> = [
  { value: 'beginner', label: '초급' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '고급' },
];

const GOAL_OPTIONS: Array<{ value: UserProfile['goal']; label: string }> = [
  { value: 'diet', label: '다이어트' },
  { value: 'muscle', label: '근력' },
  { value: 'health', label: '건강' },
  { value: 'flexibility', label: '유연성' },
];

interface FormState {
  nickname: string;
  gender: UserProfile['gender'];
  age: string;
  heightCm: string;
  weightKg: string;
  fitnessLevel: UserProfile['fitnessLevel'];
  goal: UserProfile['goal'];
  weeklyTargetDays: string;
}

const INITIAL_FORM: FormState = {
  nickname: '',
  gender: 'none',
  age: '',
  heightCm: '',
  weightKg: '',
  fitnessLevel: 'beginner',
  goal: 'diet',
  weeklyTargetDays: '',
};

type FieldErrors = Partial<Record<'nickname' | 'age' | 'heightCm' | 'weightKg' | 'weeklyTargetDays', string>>;

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.nickname.trim()) {
    errors.nickname = '닉네임을 입력해주세요';
  }

  const age = Number(form.age);
  if (!form.age || Number.isNaN(age) || age < 10 || age > 100) {
    errors.age = '나이는 10~100세 사이로 입력해주세요';
  }

  const heightCm = Number(form.heightCm);
  if (!form.heightCm || Number.isNaN(heightCm) || heightCm < 120 || heightCm > 220) {
    errors.heightCm = '키는 120~220cm 사이로 입력해주세요';
  }

  const weightKg = Number(form.weightKg);
  if (!form.weightKg || Number.isNaN(weightKg) || weightKg < 30 || weightKg > 250) {
    errors.weightKg = '몸무게는 30~250kg 사이로 입력해주세요';
  }

  const weeklyTargetDays = Number(form.weeklyTargetDays);
  if (!form.weeklyTargetDays || Number.isNaN(weeklyTargetDays) || weeklyTargetDays < 1 || weeklyTargetDays > 7) {
    errors.weeklyTargetDays = '주간 목표일은 1~7일 사이로 입력해주세요';
  }

  return errors;
}

export default function Onboarding() {
  console.log('DEBUG Onboarding render');
  const navigate = useNavigate();
  const [flags] = useState<AppFlags>(() => getFlags<AppFlags>());
  console.log('DEBUG Onboarding flags.onboardingDone=', flags.onboardingDone);
  const [aiAcknowledged, setAiAcknowledged] = useState(flags.aiNoticeAcknowledged);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    if (flags.onboardingDone) {
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (flags.onboardingDone) {
    return null;
  }

  function ackAiNotice() {
    patchFlags<AppFlags>({ aiNoticeAcknowledged: true });
    setAiAcknowledged(true);
  }

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as keyof FieldErrors];
      return next;
    });
  }

  function selectChip<K extends 'gender' | 'fitnessLevel' | 'goal'>(key: K, value: FormState[K]) {
    fireTickHaptic();
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const profile: UserProfile = {
      id: makeProfileId(),
      nickname: form.nickname.trim(),
      gender: form.gender,
      age: Number(form.age),
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      fitnessLevel: form.fitnessLevel,
      goal: form.goal,
      weeklyTargetDays: Number(form.weeklyTargetDays),
      createdAt: Date.now(),
    };

    saveProfile(profile);
    patchFlags<AppFlags>({ onboardingDone: true });
    setToastOpen(true);
    navigate('/');
  }

  return (
    <>
      <AlertDialog
        open={!aiAcknowledged}
        title="이 서비스는 생성형 AI를 활용합니다"
        description="AI가 운동 플랜과 리포트를 만들어요. 결과는 참고용으로 확인해주세요."
        alertButton={<AlertDialog.AlertButton onClick={ackAiNotice}>확인</AlertDialog.AlertButton>}
        onClose={ackAiNotice}
      />

      <ScreenScaffold
        top={<Top title={<Top.TitleParagraph>나에게 맞는 코치를 만들어요</Top.TitleParagraph>} />}
        bottom={<SubmitFooter label="프로필 저장" onClick={handleSubmit} />}
      >
        <TextField
          variant="box"
          label="닉네임"
          placeholder="지훈"
          value={form.nickname}
          onChange={(e) => updateField('nickname', e.target.value)}
          hasError={!!errors.nickname}
          help={errors.nickname}
        />

        <Spacing size={20} />

        <Paragraph.Text typography="t4">성별</Paragraph.Text>
        <Spacing size={8} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {GENDER_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              variant={form.gender === opt.value ? 'fill' : 'weak'}
              onClick={() => selectChip('gender', opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>

        <Spacing size={20} />

        <TextField
          variant="box"
          label="나이"
          placeholder="30"
          inputMode="numeric"
          value={form.age}
          onChange={(e) => updateField('age', e.target.value)}
          hasError={!!errors.age}
          help={errors.age}
        />

        <Spacing size={12} />

        <TextField
          variant="box"
          label="키 (cm)"
          placeholder="175"
          inputMode="numeric"
          value={form.heightCm}
          onChange={(e) => updateField('heightCm', e.target.value)}
          hasError={!!errors.heightCm}
          help={errors.heightCm}
        />

        <Spacing size={12} />

        <TextField
          variant="box"
          label="몸무게 (kg)"
          placeholder="72"
          inputMode="numeric"
          value={form.weightKg}
          onChange={(e) => updateField('weightKg', e.target.value)}
          hasError={!!errors.weightKg}
          help={errors.weightKg}
        />

        <Spacing size={20} />

        <Paragraph.Text typography="t4">체력 수준</Paragraph.Text>
        <Spacing size={8} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FITNESS_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              variant={form.fitnessLevel === opt.value ? 'fill' : 'weak'}
              onClick={() => selectChip('fitnessLevel', opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>

        <Spacing size={20} />

        <Paragraph.Text typography="t4">목표</Paragraph.Text>
        <Spacing size={8} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {GOAL_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              variant={form.goal === opt.value ? 'fill' : 'weak'}
              onClick={() => selectChip('goal', opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>

        <Spacing size={20} />

        <TextField
          variant="box"
          label="주간 목표일"
          placeholder="3"
          inputMode="numeric"
          value={form.weeklyTargetDays}
          onChange={(e) => updateField('weeklyTargetDays', e.target.value)}
          hasError={!!errors.weeklyTargetDays}
          help={errors.weeklyTargetDays}
        />

        <Spacing size={96} />
      </ScreenScaffold>

      <Toast open={toastOpen} position="bottom" text="프로필이 저장됐어요" onClose={() => setToastOpen(false)} />
    </>
  );
}

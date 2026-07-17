import { useState } from 'react';
import { Top, Paragraph, Spacing, ListRow, Chip, Button, Border, Toast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { Amount } from '@/components/Amount';
import { EmptyState } from '@/components/StateView';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import {
  getChallenges,
  joinChallenge,
  completeToday,
  generateShareCode,
  type Challenge,
} from '@/lib/storage.challenges';

interface ChallengeTemplate {
  id: string;
  name: string;
  targetDays: number;
  description: string;
}

const CHALLENGE_CATALOG: ChallengeTemplate[] = [
  { id: 'squat-7day', name: '7일 스쿼트 챌린지', targetDays: 7, description: '7일 동안 매일 스쿼트' },
];

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '플랜', path: '/plan' },
  { label: '챌린지', path: '/challenges' },
];

/** SDK는 WebView 밖에서 throw하므로 가드 필수. */
function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>(() => getChallenges());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const joinedIds = new Set(challenges.map((c) => c.id));
  const available = CHALLENGE_CATALOG.filter((template) => !joinedIds.has(template.id));

  function handleJoin(template: ChallengeTemplate) {
    fireHaptic('tickWeak');
    const challenge: Challenge = {
      id: template.id,
      name: template.name,
      shareCode: generateShareCode(),
      completedDates: [],
    };
    joinChallenge(template.id, challenge);
    setChallenges(getChallenges());
  }

  function handleCompleteToday(challengeId: string) {
    fireHaptic('success');
    const result = completeToday(challengeId);
    setChallenges(getChallenges());
    if (result.ok && !result.changed) {
      setToastMsg('오늘은 이미 완료했어요');
    }
  }

  function handleCopyCode(shareCode: string) {
    try {
      navigator.clipboard
        ?.writeText(shareCode)
        .then(() => setToastMsg('코드를 복사했어요'))
        .catch(() => {});
    } catch {
      /* 클립보드 미지원 — 무시 */
    }
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>챌린지</Top.TitleParagraph>} />}>
      {challenges.length === 0 ? (
        <EmptyState
          title="참여 중인 챌린지가 없어요"
          description="챌린지에 참여하면 매일 운동 습관을 만들 수 있어요"
          action={
            <Button variant="weak" onClick={() => handleJoin(CHALLENGE_CATALOG[0])}>
              챌린지 참여하기
            </Button>
          }
        />
      ) : (
        challenges.map((challenge) => {
          const template = CHALLENGE_CATALOG.find((t) => t.id === challenge.id);
          const targetDays = template?.targetDays ?? challenge.completedDates.length;
          return (
            <div key={challenge.id}>
              <SummaryHero
                label={challenge.name}
                value={
                  <Amount
                    value={challenge.completedDates.length}
                    unit={` / ${targetDays}일`}
                    typography="t1"
                  />
                }
                caption={`공유 코드 ${challenge.shareCode}`}
              />
              <Spacing size={12} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="fill"
                  size="large"
                  display="block"
                  onClick={() => handleCompleteToday(challenge.id)}
                >
                  오늘 완료
                </Button>
                <Button variant="weak" size="large" onClick={() => handleCopyCode(challenge.shareCode)}>
                  코드 복사
                </Button>
              </div>
              <Spacing size={24} />
            </div>
          );
        })
      )}

      {available.length > 0 && (
        <>
          <Border />
          <Spacing size={16} />
          <Paragraph.Text typography="t4">참여할 수 있는 챌린지</Paragraph.Text>
          <Spacing size={12} />
          {available.map((template) => (
            <ListRow
              key={template.id}
              contents={
                <ListRow.Texts type="2RowTypeA" top={template.name} bottom={template.description} />
              }
              right={
                <Chip kind="action" variant="weak" size="small" onClick={() => handleJoin(template)}>
                  참여하기
                </Chip>
              }
            />
          ))}
        </>
      )}

      <Spacing size={80} />
      <FloatingTabBar items={TAB_ITEMS} />
      <Toast
        open={toastMsg !== null}
        position="bottom"
        text={toastMsg ?? ''}
        onClose={() => setToastMsg(null)}
      />
    </ScreenScaffold>
  );
}

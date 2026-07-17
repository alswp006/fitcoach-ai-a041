import { BottomSheet, Paragraph, Spacing, Button } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';

/**
 * 잠금 운동(isFree=false) 탭 시 노출되는 프리미엄 업셀 BottomSheet.
 *
 * Pre-built 성격의 로컬 컴포넌트 — 잠금 콘텐츠를 만나는 화면(Home, Plan 등)에서 공용으로 재사용.
 */
export function PremiumSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <BottomSheet open={open} onClose={onClose}>
      <Paragraph.Text typography="t3">프리미엄에서 잠금 해제돼요</Paragraph.Text>
      <Spacing size={4} />
      <Paragraph.Text typography="t6">
        전체 운동 6종을 광고 없이 이용할 수 있어요
      </Paragraph.Text>
      <Spacing size={20} />
      <Button
        variant="fill"
        display="block"
        onClick={() => {
          onClose();
          navigate('/premium');
        }}
      >
        프리미엄 보러 가기
      </Button>
    </BottomSheet>
  );
}

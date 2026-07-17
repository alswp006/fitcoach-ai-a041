import { FloatingTabBar } from './FloatingTabBar';

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '플랜', path: '/plan' },
  { label: '챌린지', path: '/challenges' },
];

/**
 * 탭-루트(홈/플랜/챌린지) 3곳에서만 App.tsx가 렌더하는 공용 하단 탭바.
 * 페이지 컴포넌트 안에 개별로 넣지 마라 — 라우트별 노출 여부는 App.tsx가 단일 결정한다.
 */
export function AppTabBar() {
  return <FloatingTabBar items={TAB_ITEMS} />;
}

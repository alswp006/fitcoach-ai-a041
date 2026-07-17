# SPEC — FitCoach AI

## Common Principles

- **플랫폼**: 앱인토스 미니앱 (Vite + React + TypeScript + TDS `@toss/tds-mobile`), React Router(react-router-dom), localStorage 영속화.
- **인증**: 토스 앱이 세션 자동 제공. 별도 로그인 함수 호출 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 연동 상태만 확인.
- **UI**: 모든 화면은 TDS 컴포넌트(ListRow, Button, TextField, Paragraph.Text, Chip, Switch, AlertDialog, BottomSheet, Toast, Top, Tab)로 조립. 하단 탭은 템플릿 제공 `src/components/FloatingTabBar` 사용. 여백은 TDS `Spacing`(size 필수)만 사용. HEX 하드코딩 금지 → `var(--tds-color-*)`.
- **모바일 최적화**: 모든 터치 타깃 ≥ 44px, 3000만 유저 대상 모바일 전용 레이아웃.
- **AI 고지 의무**: 개인화 플랜·운동 리포트는 생성형 AI 결과물 → 첫 이용 고지 1회 + 모든 결과물에 "AI가 생성한 결과입니다" 배지 필수.
- **온디바이스 ML**: 자세 분석은 카메라(getUserMedia) + MediaPipe/MoveNet 포즈 추정(브라우저 온디바이스). 서버 전송 없음. 음성 피드백은 Web Speech API(SpeechSynthesis).
- **외부 API**: 개인화 플랜/리포트 생성은 외부 Railway API 서버(CORS 허용) 호출. 그 외 데이터는 localStorage.
- **수익화**: 무료(운동 3개), 프리미엄(월 12,900원, IAP), 배너/보상형 광고.
- **금지**: 서버사이드 코드(앱 내), 외부 도메인 이탈, 외부 로깅(GA/Amplitude), 앱 설치 유도, 최신 전용 API(Android 7+/iOS 16+ 호환).

---

## Data Models

### UserProfile — 온보딩 프로필
```typescript
interface UserProfile {
  id: string;              // crypto.randomUUID()
  nickname: string;        // 1~12자
  gender: 'male' | 'female' | 'none';
  age: number;             // 14~90
  heightCm: number;        // 120~220
  weightKg: number;        // 30~200
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goal: 'diet' | 'muscle' | 'health' | 'flexibility';
  weeklyTargetDays: number; // 1~7
  createdAt: number;        // Date.now()
}
```

### Exercise — 운동 정의(정적 카탈로그, 앱 번들 내 JSON)
```typescript
interface Exercise {
  id: string;              // 'squat', 'pushup', ...
  name: string;            // "스쿼트"
  targetMuscle: string;    // "하체"
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isFree: boolean;         // 무료 3개 = true
  keyJoints: JointRule[];  // 각도 규칙
  guideText: string;       // 준비 자세 설명
}
interface JointRule {
  joint: 'knee' | 'hip' | 'elbow' | 'shoulder' | 'back';
  minAngle: number;        // 목표 최소 각도(도)
  maxAngle: number;        // 목표 최대 각도(도)
  feedbackLow: string;     // "무릎을 더 굽히세요"
  feedbackHigh: string;    // "무릎을 너무 굽혔어요"
}
```

### WorkoutPlan — AI 개인화 플랜
```typescript
interface WorkoutPlan {
  id: string;
  weekOf: string;          // "2026-07-13" (해당 주 월요일)
  exerciseIds: string[];   // 3~6개
  aiGenerated: true;
  generatedAt: number;
  summary: string;         // AI 생성 요약 텍스트
}
```

### WorkoutSession — 운동 실행 기록
```typescript
interface WorkoutSession {
  id: string;
  exerciseId: string;
  date: string;            // "2026-07-17"
  startedAt: number;
  durationSec: number;
  totalReps: number;
  avgFormScore: number;    // 0~100
  caloriesBurned: number;  // 정수
  feedbackCounts: Record<string, number>; // { "무릎을 더 굽히세요": 4 }
}
```

### AnalysisReport — AI 리포트(세션당 1개)
```typescript
interface AnalysisReport {
  sessionId: string;
  formScore: number;       // 0~100
  improvements: string[];  // ["무릎 각도가 얕습니다", ...] 최대 3개
  muscleActivation: { muscle: string; percent: number }[];
  caloriesBurned: number;
  aiGenerated: true;
  createdAt: number;
}
```

### Challenge — 챌린지
```typescript
interface Challenge {
  id: string;
  title: string;           // "7일 스쿼트 챌린지"
  targetDays: number;      // 7
  joinedAt: number;
  completedDates: string[];// ["2026-07-15", ...]
  shareCode: string;       // 6자리 영숫자
}
```

### AppFlags — 상태 플래그
```typescript
interface AppFlags {
  aiNoticeAcknowledged: boolean; // AI 고지 확인
  onboardingDone: boolean;
  isPremium: boolean;
  premiumUntil: number | null;
}
```

### localStorage 키 & 크기 추정
| 키 | 데이터 | 추정 크기 |
|----|--------|-----------|
| `fitcoach:profile` | UserProfile | ~0.3 KB |
| `fitcoach:plans` | WorkoutPlan[] (최근 8주) | ~4 KB |
| `fitcoach:sessions` | WorkoutSession[] (최근 200개, 초과 시 오래된 것 제거) | ~120 KB |
| `fitcoach:reports` | AnalysisReport[] (세션 200개 대응) | ~150 KB |
| `fitcoach:challenges` | Challenge[] (최대 20개) | ~10 KB |
| `fitcoach:flags` | AppFlags | ~0.2 KB |
| **합계** | | **~285 KB (< 5MB)** |

Exercise 카탈로그는 앱 번들 내 정적 JSON(localStorage 미사용).

---

## Feature List

### F1. 데이터 계층 & 저장소 (localStorage 유틸)

- **Description**: 모든 엔티티의 CRUD를 담당하는 타입 안전한 localStorage 래퍼. 저장 실패(용량 초과·파싱 오류)를 복구하고, 세션/리포트 200개 상한 관리를 담당한다. UI 없는 순수 로직 계층.
- **Data**: 전체 모델
- **API**: 없음(로컬)
- **Requirements**:
  - **AC-1 [U][P0]**: Scenario: 프로필 저장/조회
    Given 앱이 실행된 상태
    When `saveProfile({ id, nickname: "지훈", age: 30, ... })` 호출
    Then `fitcoach:profile` 키에 JSON 직렬화되어 저장되고, `getProfile()`이 동일 객체를 반환
  - **AC-2 [E][P0]**: Scenario: 세션 추가 시 상한 관리
    Given `fitcoach:sessions`에 200개 세션이 있을 때
    When `addSession(newSession)` 호출
    Then 가장 오래된(startedAt 최소) 1개가 제거되고 신규가 추가되어 배열 길이가 200으로 유지됨
  - **AC-3 [W][P1]**: Scenario: 저장 용량 초과 처리
    Given localStorage `setItem`이 `QuotaExceededError`를 던지는 상태
    When `addSession(newSession)` 호출
    Then 오래된 세션 20개를 제거 후 1회 재시도하고, 재시도도 실패 시 `{ ok: false, reason: 'quota' }` 반환(throw 금지)
  - **AC-4 [W][P1]**: Scenario: 손상된 JSON 복구
    Given `fitcoach:sessions` 값이 `"{잘못된json"`인 상태
    When `getSessions()` 호출
    Then 예외 없이 빈 배열 `[]`을 반환하고 해당 키를 초기화
  - **AC-5 [S][P1]**: Scenario: 최초 실행 빈 상태
    Given localStorage에 어떤 `fitcoach:*` 키도 없는 상태
    When `getProfile()`, `getSessions()` 호출
    Then 각각 `null`, `[]`을 반환(에러 없음)
  - **AC-6 [U][P0]**: Scenario: 콘솔 에러 0개
    Given 프로덕션 빌드
    When 모든 CRUD 함수가 정상/예외 경로로 실행됨
    Then `console.error` 출력이 0개(내부 처리는 반환값으로만 전달)

---

### F2. 온보딩 & AI 고지 & 프로필 입력

- **Description**: 첫 진입 시 생성형 AI 활용 고지 다이얼로그를 1회 표시하고, 닉네임·성별·나이·키·몸무게·체력수준·목표·주간 목표일을 입력받아 프로필을 생성한다. 완료 시 홈으로 이동한다.
- **Data**: UserProfile, AppFlags
- **API**: 없음
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: AI 서비스 첫 이용 고지
    Given `flags.aiNoticeAcknowledged === false`인 상태로 온보딩 진입
    When 화면이 마운트됨
    Then TDS AlertDialog에 "이 서비스는 생성형 AI를 활용합니다" 안내가 1회 표시됨
    And "확인" 버튼 탭 시 `flags.aiNoticeAcknowledged = true`가 저장되어 재표시되지 않음
  - **AC-2 [E][P0]**: Scenario: 프로필 저장 성공
    Given AI 고지를 확인한 상태
    When 폼에서 `{ nickname: "지훈", gender: "male", age: 30, heightCm: 175, weightKg: 72, fitnessLevel: "beginner", goal: "diet", weeklyTargetDays: 3 }` 제출
    Then UserProfile가 저장되고 `flags.onboardingDone = true`, 성공 토스트 "프로필이 저장됐어요" 표시 후 `navigate('/')`
  - **AC-3 [W][P1]**: Scenario: 빈 닉네임 거부
    Given 온보딩 폼
    When `nickname: ""`로 제출
    Then 에러 메시지 "닉네임을 입력해주세요" 표시, 저장/이동 없음
  - **AC-4 [W][P1]**: Scenario: 범위 밖 신체 값 거부
    Given 온보딩 폼
    When `{ heightCm: 300, weightKg: 72 }` 제출
    Then 에러 메시지 "키는 120~220cm 사이로 입력해주세요" 표시, 저장 없음
  - **AC-5 [E][P1]**: Scenario: 모바일 키보드 대응
    Given 나이/키/몸무게 TDS TextField
    When 필드 포커스
    Then `inputMode="numeric"` 숫자 키패드가 표시되고, 포커스된 필드가 키보드에 가려지지 않도록 스크롤됨
  - **AC-6 [S][P1]**: Scenario: 온보딩 완료자 재진입 차단
    Given `flags.onboardingDone === true`인 상태
    When `/onboarding` 라우트 직접 접근
    Then 즉시 `navigate('/', { replace: true })`로 리다이렉트
  - **AC-7 [U][P0]**: Scenario: TDS 컴포넌트 사용
    Given 온보딩 화면
    Then 입력은 TDS TextField, 성별/목표 선택은 TDS Chip, 제출은 하단 고정 TDS Button(display="block")으로 구성됨

---

### F3. AI 개인화 운동 플랜 생성 (보상형 광고 게이트)

- **Description**: 사용자 프로필을 외부 AI API로 전송해 이번 주 운동 플랜(운동 3~6개 + 요약)을 생성한다. 무료 유저는 결과 보기 전 보상형 광고를 시청한다. 플랜은 주 단위로 캐시되며 AI 결과물 배지를 표시한다.
- **Data**: WorkoutPlan, UserProfile
- **API**: `POST /api/plan` (아래 API Contract 참조)
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 플랜 생성 성공
    Given 프로필이 저장된 무료 유저
    When "플랜 만들기" 버튼 탭 → TossRewardAd 광고 시청 완료
    Then `POST /api/plan`에 프로필 전송, 응답 플랜이 `fitcoach:plans`에 저장되고 운동 카드 목록 + AI 요약이 표시됨
  - **AC-2 [U][P0]**: Scenario: AI 결과물 라벨 표시
    Given 플랜 결과가 화면에 표시될 때
    Then 플랜 카드 상단에 "AI가 생성한 결과입니다" 배지(TDS Badge/Chip)가 표시됨
  - **AC-3 [E][P0]**: Scenario: 프리미엄 유저 광고 스킵
    Given `flags.isPremium === true`
    When "플랜 만들기" 탭
    Then 광고 없이 즉시 API 호출 및 결과 표시
  - **AC-4 [S][P1]**: Scenario: 생성 로딩 상태
    Given 플랜 API 호출 중(pending)
    When 응답 대기
    Then TDS 스켈레톤/로딩 인디케이터와 "플랜을 만드는 중..." 표시, 버튼은 disabled
  - **AC-5 [W][P1]**: Scenario: API 실패 처리
    Given `POST /api/plan`이 500 또는 네트워크 오류를 반환
    When 플랜 생성 시도
    Then 에러 배너 "플랜 생성에 실패했어요. 다시 시도해주세요" + "다시 시도" 버튼 표시, 앱 크래시 없음
  - **AC-6 [W][P1]**: Scenario: CORS 에러 방지
    Given 외부 Railway API 호출
    Then 응답 헤더에 `Access-Control-Allow-Origin`이 설정되어 CORS 에러 0개
  - **AC-7 [S][P1]**: Scenario: 이번 주 캐시 재사용 (빈 상태 아님)
    Given `fitcoach:plans`에 `weekOf`가 이번 주인 플랜이 존재
    When `/plan` 진입
    Then API 재호출 없이 저장된 플랜을 즉시 표시하고 "이번 주 플랜" 라벨 표시
  - **AC-8 [W][P1]**: Scenario: 프로모션 지급 한도 검증
    Given 신규 유저 유치 프로모션으로 `grantPromotionReward` 호출 시
    Then `amount ≤ 5000`을 검증하며, 초과 값은 5000으로 클램프

---

### F4. 운동 세션 실행 (카메라 실시간 자세 분석 + 음성 피드백)

- **Description**: 카메라를 켜 온디바이스 포즈 추정으로 관절 각도를 측정하고, JointRule 위반 시 즉시 음성/텍스트 피드백을 제공한다. 반복 횟수를 카운트하고 세션 종료 시 WorkoutSession을 저장한다.
- **Data**: WorkoutSession, Exercise
- **API**: 없음(온디바이스)
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 카메라 권한 허용 후 분석 시작
    Given 사용자가 `/workout/squat` 진입
    When 카메라 권한 허용
    Then `getUserMedia({ video: { facingMode: 'user' } })`로 프리뷰가 표시되고 포즈 추정 오버레이가 렌더됨
  - **AC-2 [E][P0]**: Scenario: 잘못된 자세 음성 피드백
    Given 스쿼트 진행 중 무릎 각도가 `JointRule.minAngle`(예: 90도) 미만
    When 해당 프레임이 감지됨
    Then `feedbackLow` 텍스트("무릎을 더 굽히세요")가 화면 표시 + Web Speech API로 1회 음성 출력(3초 내 중복 발화 금지)
  - **AC-3 [E][P0]**: Scenario: 반복 카운트 및 세션 저장
    Given 스쿼트 1회 완료(각도가 min→max→min 사이클)
    When 사이클 감지
    Then `totalReps`가 1 증가하고, "종료" 탭 시 WorkoutSession이 `avgFormScore`, `caloriesBurned` 포함해 저장됨
  - **AC-4 [W][P1]**: Scenario: 카메라 권한 거부
    Given 사용자가 카메라 권한 거부
    When 세션 화면 진입
    Then 빈 상태 안내 "카메라 권한이 필요해요. 설정에서 허용해주세요" + "홈으로" 버튼 표시, 크래시 없음
  - **AC-5 [W][P1]**: Scenario: 무료 유저 잠금 운동 접근 차단
    Given `flags.isPremium === false` 이고 `exercise.isFree === false`
    When 해당 운동 세션 진입 시도
    Then BottomSheet "프리미엄 전용 운동이에요" + "구독하기" 버튼 표시, 카메라 미실행
  - **AC-6 [S][P1]**: Scenario: 포즈 로딩 상태
    Given 포즈 추정 모델 로딩 중
    When 모델 초기화 대기
    Then "AI 분석 준비 중..." 로딩 표시, 준비 완료 전 카운트/피드백 미동작
  - **AC-7 [U][P0]**: Scenario: 화면 이탈 시 카메라 해제
    Given 세션 화면
    When 언마운트/뒤로가기
    Then MediaStream 트랙이 `stop()`되어 카메라 표시등이 꺼짐(리소스 누수 0)
  - **AC-8 [U][P1]**: Scenario: iOS 16+/Android 7+ 호환
    Given 대상 최소 버전 브라우저
    Then getUserMedia/SpeechSynthesis 미지원 시 텍스트 피드백만 제공하는 폴백으로 동작(최신 전용 API 미사용)

---

### F5. AI 운동 리포트 (보상형 광고 게이트)

- **Description**: 종료된 세션 데이터를 외부 AI API로 보내 폼 점수·개선점·근육 활성도·칼로리 리포트를 생성한다. 무료 유저는 결과 보기 전 보상형 광고를 시청하며, AI 결과물 배지를 표시한다.
- **Data**: AnalysisReport, WorkoutSession
- **API**: `POST /api/report`
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 리포트 생성 (광고 게이트)
    Given 세션 종료 후 `/report/:sessionId` 진입, 무료 유저
    When "리포트 보기" 탭 → TossRewardAd 시청 완료
    Then `POST /api/report`로 세션 전송, 응답 리포트가 저장되고 SummaryHero(formScore CountUp) + 개선점 카드가 표시됨
  - **AC-2 [U][P0]**: Scenario: AI 결과물 라벨
    Given 리포트 결과 표시 시
    Then "AI가 생성한 결과입니다" 배지가 리포트 상단에 표시됨
  - **AC-3 [U][P0]**: Scenario: 핵심 지표 카드 레이아웃
    Given 리포트 화면
    Then `data-testid="report-hero"` SummaryHero(폼 점수)와 `data-testid="muscle-bar"` MiniBar(근육 활성도)와 개선점 Card가 존재하며 폼 점수는 강조 타이포(t2)로 표기됨
  - **AC-4 [S][P1]**: Scenario: 로딩 상태
    Given 리포트 생성 API pending
    Then 스켈레톤 카드 3개 + "분석 리포트 작성 중..." 표시
  - **AC-5 [W][P1]**: Scenario: 리포트 API 실패
    Given `POST /api/report` 오류(5xx/타임아웃)
    Then "리포트를 못 만들었어요. 다시 시도해주세요" + "다시 시도" 버튼, 로컬 세션 데이터는 유지됨
  - **AC-6 [W][P1]**: Scenario: 존재하지 않는 세션
    Given 잘못된 `sessionId`로 진입
    When 세션 조회 실패
    Then 빈 상태 "리포트를 찾을 수 없어요" + "기록으로" 버튼 표시, 크래시 없음
  - **AC-7 [S][P1]**: Scenario: 캐시된 리포트 재조회
    Given 해당 `sessionId`의 리포트가 이미 `fitcoach:reports`에 존재
    When 재진입
    Then API 재호출·광고 없이 저장된 리포트 즉시 표시

---

### F6. 운동 기록 히스토리 & 통계 대시보드 (홈)

- **Description**: 홈 대시보드에서 이번 주 운동 완료일, 총 칼로리, 평균 폼 점수를 시각화하고, 전체 세션 히스토리를 최신순 리스트로 제공한다. 긴 목록은 가상 스크롤을 사용한다.
- **Data**: WorkoutSession, WorkoutPlan
- **API**: 없음
- **Requirements**:
  - **AC-1 [U][P0]**: Scenario: 대시보드 지표 표시
    Given `fitcoach:sessions`에 세션이 존재
    When 홈 진입
    Then `data-testid="cal-hero"` SummaryHero(이번 주 총 칼로리 CountUp)와 `data-testid="score-trend"` Sparkline(최근 7세션 폼 점수 추이) 카드가 표시됨
  - **AC-2 [E][P0]**: Scenario: 히스토리 최신순 정렬
    Given 세션 5개가 서로 다른 날짜로 존재
    When 히스토리 목록 렌더
    Then `startedAt` 내림차순 TDS ListRow로 표시되고 각 행에 날짜/운동명/폼점수가 노출됨
  - **AC-3 [E][P1]**: Scenario: 행 탭 → 리포트 이동
    Given 히스토리 목록의 한 행
    When 세션 행 탭
    Then `navigate('/report/{sessionId}')`로 이동
  - **AC-4 [S][P1]**: Scenario: 빈 상태
    Given 세션이 0개
    When 홈 진입
    Then Asset.ContentIcon + "아직 운동 기록이 없어요" + "운동 시작하기"(플랜으로 이동) 버튼 표시
  - **AC-5 [S][P1]**: Scenario: 긴 목록 가상 스크롤
    Given 세션이 100개 이상
    When 히스토리 스크롤
    Then 가상 스크롤로 보이는 영역만 렌더되어 60fps 스크롤 유지(전체 DOM 미생성)
  - **AC-6 [E][P1]**: Scenario: 배너 광고 배치
    Given 무료 유저 홈 화면
    Then AdSlot 배너가 대시보드 카드와 히스토리 목록 사이에 배치되고 콘텐츠를 가리지 않음
  - **AC-7 [W][P1]**: Scenario: 손상 데이터 방어
    Given 일부 세션 객체에 `avgFormScore`가 누락
    When 통계 계산
    Then 누락 값을 0으로 처리해 NaN 없이 렌더(콘솔 에러 0)

---

### F7. 챌린지 & 기록 공유

- **Description**: 사용자는 사전 정의된 챌린지에 참여해 완료일을 누적하고, 6자리 공유 코드로 진행 상황을 앱 내에서 공유(복사)한다. 진행률 바로 달성률을 표시한다. 외부 도메인 이탈 없이 동작한다.
- **Data**: Challenge, WorkoutSession
- **API**: 없음(로컬)
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 챌린지 참여
    Given 챌린지 목록에서 "7일 스쿼트 챌린지"
    When "참여하기" 탭
    Then Challenge가 `shareCode`(6자리) 생성되어 저장되고, 참여 목록에 추가됨
  - **AC-2 [E][P0]**: Scenario: 오늘 완료 체크
    Given 참여 중 챌린지, 오늘 스쿼트 세션 완료
    When 챌린지 화면에서 "오늘 완료" 탭
    Then `completedDates`에 오늘 날짜가 1회만 추가되고 진행률 바(`completedDates.length / targetDays`)가 갱신됨
  - **AC-3 [E][P1]**: Scenario: 공유 코드 복사
    Given 참여 중 챌린지
    When "공유" 탭
    Then `navigator.clipboard`로 shareCode 복사 후 토스트 "코드가 복사됐어요" 표시(외부 URL 이동 없음)
  - **AC-4 [W][P1]**: Scenario: 중복 완료 방지
    Given 오늘 이미 완료 처리된 챌린지
    When 다시 "오늘 완료" 탭
    Then `completedDates` 변화 없음 + 토스트 "오늘은 이미 완료했어요"
  - **AC-5 [S][P1]**: Scenario: 빈 상태
    Given 참여 챌린지 0개
    When 챌린지 화면 진입
    Then Asset.ContentIcon + "참여 중인 챌린지가 없어요" 안내 표시
  - **AC-6 [W][P0]**: Scenario: 외부 도메인 이탈 금지
    Given 공유/챌린지 기능
    Then `window.open`, `window.location.href`로 외부 URL 이동 시도가 코드에 존재하지 않음(앱 내 클립보드 공유만)
  - **AC-7 [E][P1]**: Scenario: 챌린지 달성
    Given `completedDates.length === targetDays`
    When 마지막 완료 체크
    Then TDS AlertDialog "챌린지 달성! 🎉" 표시, 진행률 100%

---

### F8. 프리미엄 구독 (IAP) & 상태 관리

- **Description**: 무료/프리미엄 전환을 관리한다. 템플릿 제공 `<TossPurchase>`로 월 구독을 결제하고, 성공 시 `flags.isPremium`을 갱신해 전체 운동 라이브러리·광고 제거·플랜 즉시 생성을 잠금 해제한다.
- **Data**: AppFlags
- **API**: IAP(TossPurchase 컴포넌트, `IAP.createOneTimePurchaseOrder` 래핑)
- **Requirements**:
  - **AC-1 [E][P0]**: Scenario: 구독 결제 성공
    Given 무료 유저가 `/premium` 진입
    When `<TossPurchase sku={VITE_TOSS_IAP_SKU} />`로 결제 완료 (`onPurchased`)
    Then `processProductGrant`에서 `flags.isPremium = true`, `premiumUntil = Date.now() + 30일` 저장, 토스트 "프리미엄이 활성화됐어요"
  - **AC-2 [S][P0]**: Scenario: 프리미엄 혜택 반영
    Given `flags.isPremium === true`
    When 앱 전체 렌더
    Then 잠금 운동이 해제되고 AdSlot 배너/보상형 광고 게이트가 모두 숨겨짐
  - **AC-3 [W][P1]**: Scenario: 결제 취소/실패
    Given 결제 진행 중
    When 사용자 취소 또는 결제 실패
    Then `flags.isPremium` 변경 없음 + 토스트 "결제가 취소됐어요", 크래시 없음
  - **AC-4 [S][P1]**: Scenario: 구독 만료 처리
    Given `flags.premiumUntil < Date.now()`
    When 앱 진입 시 상태 검사
    Then `flags.isPremium = false`로 갱신되어 무료 상태 복귀
  - **AC-5 [S][P1]**: Scenario: 이미 프리미엄
    Given `flags.isPremium === true`
    When `/premium` 진입
    Then 결제 버튼 대신 "프리미엄 이용 중 (만료: 2026-08-16)" 상태 카드 표시
  - **AC-6 [U][P1]**: Scenario: 가격 고지
    Given 구독 화면
    Then 혜택 목록(전체 운동/실시간 교정/개인화 플랜)과 "월 12,900원"이 TDS Paragraph.Text로 명시됨(설치 유도 문구 없음)

---

## Screen Definitions

### S1. 온보딩 `/onboarding`
- **TDS 컴포넌트**: Top(타이틀), TextField(닉네임/나이/키/몸무게), Chip(성별/체력수준/목표 선택), TextField, AlertDialog(AI 고지), 하단 고정 Button(display="block"), Spacing
- **골격**: ScreenScaffold로 감싸고 제출은 SubmitFooter(하단 고정)
- **Loading/Empty/Error**: 초기 로딩 없음 / 빈 폼 기본값 / 검증 실패 시 필드별 인라인 에러 텍스트
- **터치**: 모든 Chip·Button ≥ 44px, 숫자 필드 `inputMode="numeric"`
- **Navigation 계약**:
  - Incoming: `location.state = undefined`
  - Outgoing: 완료 → `navigate('/', { replace: true })`

### S2. 홈 대시보드 `/` (FloatingTabBar 탭)
- **TDS 컴포넌트**: Top, Card, ListRow, Button, Chip, Spacing + SummaryHero(CountUp), Sparkline, AdSlot
- **골격**: ScreenScaffold, 지표는 Card로 묶어 위계 표현
- **Loading**: 통계 계산 중 스켈레톤 카드 / **Empty**: Asset.ContentIcon + "아직 운동 기록이 없어요" / **Error**: 손상 데이터 0 처리
- **레이아웃 AC**: `data-testid="cal-hero"` SummaryHero + `data-testid="score-trend"` Sparkline 존재
- **터치**: 히스토리 ListRow 높이 ≥ 44px
- **Navigation 계약**:
  - Incoming: `location.state = undefined`
  - Outgoing: 운동 시작 → `navigate('/plan')`; 세션 행 탭 → `navigate('/report/{sessionId}')`

### S3. 개인화 플랜 `/plan` (FloatingTabBar 탭)
- **TDS 컴포넌트**: Top, Card, Chip(AI 배지), Button, Badge, Spacing + TossRewardAd(게이트), 스켈레톤
- **골격**: ScreenScaffold, 플랜 운동은 Card 목록, 상단 "AI가 생성한 결과입니다" 배지
- **Loading**: "플랜을 만드는 중..." + 스켈레톤 / **Empty**: "플랜 만들기" CTA / **Error**: 배너 + "다시 시도"
- **터치**: 운동 카드 탭 영역 ≥ 44px
- **Navigation 계약**:
  - Incoming: `location.state = undefined`
  - Outgoing: 운동 카드 탭 → `navigate('/workout/{exerciseId}', { state: { exerciseId: string } })`

### S4. 운동 세션 `/workout/:exerciseId`
- **TDS 컴포넌트**: Top(닫기), Button(종료), Paragraph.Text(피드백/카운트), BottomSheet(프리미엄 잠금), Toast
- **골격**: 카메라 프리뷰는 full-bleed video + 오버레이 canvas(TDS 미제공 레이아웃 → 커스텀 flex 허용), 컨트롤은 하단 Button
- **Loading**: "AI 분석 준비 중..." / **Empty(권한 거부)**: "카메라 권한이 필요해요" + "홈으로" / **Error**: 모델 로드 실패 폴백
- **터치**: 종료/닫기 버튼 ≥ 44px
- **Navigation 계약**:
  - Incoming: `useParams().exerciseId: string`
  - Outgoing: 종료 → `navigate('/report/{sessionId}', { state: { sessionId: string } })`

### S5. AI 리포트 `/report/:sessionId`
- **TDS 컴포넌트**: Top, Card, Badge(AI 라벨), Button, Spacing + SummaryHero(폼점수 CountUp), MiniBar(근육 활성도), TossRewardAd
- **골격**: ScreenScaffold, 결과는 Card 위계, 폼 점수 t2 강조
- **레이아웃 AC**: `data-testid="report-hero"` SummaryHero + `data-testid="muscle-bar"` MiniBar 존재
- **Loading**: 스켈레톤 3개 + "분석 리포트 작성 중..." / **Empty**: "리포트를 찾을 수 없어요" / **Error**: "다시 시도"
- **터치**: 하단 "기록 보기" Button ≥ 44px
- **Navigation 계약**:
  - Incoming: `useParams().sessionId: string`; `location.state = { sessionId: string } | undefined`
  - Outgoing: "기록 보기" → `navigate('/', { replace: true })`

### S6. 챌린지 `/challenges` (FloatingTabBar 탭)
- **TDS 컴포넌트**: Top, ListRow, Card, Button, Chip(진행률), AlertDialog(달성), Toast, Asset.ContentIcon
- **골격**: ScreenScaffold, 챌린지는 Card + 진행률 MiniBar
- **Loading**: 없음(로컬) / **Empty**: "참여 중인 챌린지가 없어요" / **Error**: 없음
- **터치**: 참여/완료/공유 Button ≥ 44px
- **Navigation 계약**:
  - Incoming: `location.state = undefined`
  - Outgoing: 화면 내 상태 전환만(외부 이동 없음)

### S7. 프리미엄 `/premium`
- **TDS 컴포넌트**: Top, Card(혜택 목록), Paragraph.Text(가격), Button + TossPurchase, Toast, Spacing
- **골격**: ScreenScaffold, 혜택은 Card, 결제는 SubmitFooter
- **Loading**: 결제 처리 중 버튼 disabled + 스피너 / **Empty**: N/A / **Error**: 취소 토스트
- **터치**: 결제 Button ≥ 44px
- **Navigation 계약**:
  - Incoming: `location.state = { from?: string } | undefined`
  - Outgoing: 결제 성공 → `navigate(-1)` 또는 `navigate('/')`

---

## API Contract (외부 Railway API — CORS 허용 필수)

### POST /api/plan — AI 개인화 플랜 생성
**Request**
```typescript
interface PlanRequest {
  gender: 'male' | 'female' | 'none';
  age: number;
  heightCm: number;
  weightKg: number;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goal: 'diet' | 'muscle' | 'health' | 'flexibility';
  weeklyTargetDays: number;
  availableExerciseIds: string[];
}
```
**Response 200**
```typescript
interface PlanResponse {
  exerciseIds: string[]; // 3~6개, availableExerciseIds 부분집합
  summary: string;       // 한국어 요약, 최대 200자
}
```
**Errors**: `400 { error: string }`(필수 필드 누락) · `429 { error: string }`(레이트리밋) · `500 { error: string }`(생성 실패)

### POST /api/report — AI 운동 리포트 생성
**Request**
```typescript
interface ReportRequest {
  exerciseId: string;
  totalReps: number;
  durationSec: number;
  avgFormScore: number;
  feedbackCounts: Record<string, number>;
  weightKg: number;
}
```
**Response 200**
```typescript
interface ReportResponse {
  formScore: number;                                   // 0~100
  improvements: string[];                              // 최대 3개, 한국어
  muscleActivation: { muscle: string; percent: number }[]; // percent 0~100
  caloriesBurned: number;                              // 정수
}
```
**Errors**: `400 { error: string }` · `429 { error: string }` · `500 { error: string }`

> 모든 에러 응답은 통일 형태 `{ error: string }`. 클라이언트는 4xx/5xx/네트워크 오류를 F3-AC5 / F5-AC5 규칙으로 처리.

---

## Assumptions

1. 카메라 포즈 추정은 브라우저 온디바이스(MediaPipe Pose 또는 TF.js MoveNet)로 수행되며 영상은 서버로 전송되지 않는다(프라이버시).
2. "AI"의 생성형 부분(플랜·리포트 요약/개선점)은 외부 Railway API가 담당하며, 해당 서버는 별도 배포·CORS 설정을 완료한다.
3. Exercise 카탈로그(무료 3개 포함)는 앱 번들 내 정적 JSON으로 제공되며 초기 버전은 스쿼트·푸시업·플랭크(무료) + 유료 운동으로 구성한다.
4. IAP는 월 단위 단건 결제(`createOneTimePurchaseOrder`)를 30일 프리미엄으로 처리하며 자동 갱신 구독은 MVP 범위 밖이다.
5. 음성 피드백은 Web Speech API `SpeechSynthesis` 한국어 음성을 사용하고, 미지원 기기는 텍스트 피드백으로 폴백한다.
6. 챌린지 공유는 앱 내 클립보드 코드 복사만 지원(실시간 친구 동기화는 서버 부재로 범위 밖).
7. 프로모션 리워드(`grantPromotionReward`)는 신규 유치 캠페인에만 사용하며 promotionCode는 앱인토스 콘솔에서 발급.

## Open Questions

1. 포즈 추정 라이브러리(MediaPipe vs MoveNet) 중 iOS 16 Safari 성능이 더 안정적인 것은? (프레임률 실측 필요)
2. 외부 AI API(Railway) 응답 지연 SLA 목표치(현재 로딩 UX는 무제한 스피너 가정) — 타임아웃 임계값 확정 필요.
3. IAP SKU 구성: 월 12,900원 단일 상품인지, 연간(10.3만원) 상품도 콘솔에 등록하는지.
4. 무료 운동 3종의 구체 종목 확정(스쿼트·푸시업·플랭크 가정).
5. 근육 활성도(muscleActivation)를 온디바이스 각도 데이터로 추정 가능한지, 아니면 서버 추정에 의존하는지.
6. 세션/리포트 200개 상한이 헤비 유저에게 충분한지, 아니면 월별 집계 압축이 필요한지.
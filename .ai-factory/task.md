# TASK — FitCoach AI

## Epic 1. Types & Contracts

**Risk Assessment**
- Complexity: Low
- Risk factors: RouteState 누락 시 페이지 간 `location.state` 타입 불일치 → 런타임 undefined 크래시. API 응답 타입과 저장 모델(WorkoutPlan/AnalysisReport) 필드 불일치.
- Mitigation: 모든 엔티티 + RouteState + API Req/Res를 최우선 단일 소스로 정의해 이후 모든 패킷이 import하도록 강제.

### Task 1.1 엔티티 타입 + RouteState + API 계약 정의
- Description: SPEC Data Models 전체(UserProfile, Exercise, JointRule, WorkoutPlan, WorkoutSession, AnalysisReport, Challenge, AppFlags)와 API Contract(PlanRequest/PlanResponse, ReportRequest/ReportResponse, ApiError), 저장 결과 타입 `StorageResult = { ok: true } | { ok: false; reason: 'quota' | 'parse' }`, 그리고 RouteState를 순수 타입으로 정의. 런타임 코드 0줄(상수/함수 금지).
- DoD:
  - `src/lib/types.ts`가 위 8개 엔티티 + 4개 API 타입 + `StorageResult` + `RouteState`를 export
  - RouteState는 다음 형태를 반드시 포함:
    ```ts
    export type RouteState = {
      '/': undefined;
      '/onboarding': undefined;
      '/plan': undefined;
      '/workout/:exerciseId': { exerciseId: string } | undefined;
      '/report/:sessionId': { sessionId: string } | undefined;
      '/challenges': undefined;
      '/premium': { from?: string } | undefined;
    };
    ```
  - `LS_KEYS` 상수는 여기 두지 않음(Task 2.1 소관)
  - `tsc --noEmit` 통과, import 사이드이펙트 0
- Covers: [F1-AC1(타입 기반), F3-AC1(계약), F5-AC1(계약)]
- Files: [`src/lib/types.ts`]
- Depends on: none

### Task 1.2 Exercise 정적 카탈로그 JSON
- Description: 번들 내 정적 운동 카탈로그 작성. 무료 3개(스쿼트·푸시업·플랭크, `isFree: true`)와 유료 3개(런지·버피·마운틴클라이머, `isFree: false`). 각 운동에 `keyJoints`(JointRule) 각도 규칙과 `guideText` 포함. 조회 헬퍼 `getExerciseById`, `getAllExercises`, `getFreeExercises` 제공.
- DoD:
  - `src/lib/exercises.ts`가 `Exercise[]` 타입으로 6개 운동 export (타입은 types.ts에서 import)
  - `isFree === true`인 항목이 정확히 3개
  - 각 운동의 `keyJoints.length >= 1`, 모든 JointRule에 `minAngle < maxAngle`, `feedbackLow`/`feedbackHigh` 한국어 문자열 존재
  - `getExerciseById('unknown')`이 `undefined` 반환(throw 없음)
  - `tsc --noEmit` 통과
- Covers: [F4-AC2(규칙 소스), F4-AC5(isFree 판정 소스)]
- Files: [`src/lib/exercises.ts`]
- Depends on: Task 1.1

---

## Epic 2. Data Layer

**Risk Assessment**
- Complexity: Medium
- Risk factors: 세션 200개 + 리포트 200개 ≈ 285KB로 5MB 여유는 있으나, QuotaExceededError는 다른 앱/도메인 공유 쿼터로 발생 가능. JSON.parse 실패 시 앱 전체 크래시. `console.error` 사용 시 F1-AC6 위반.
- Mitigation: 저장소 래퍼(2.1)를 페이지보다 먼저 확정해 모든 페이지가 안전한 반환값(`StorageResult`) 계약만 사용. 상한 관리와 quota 재시도를 래퍼 내부에 캡슐화해 UI가 예외를 다루지 않게 함.

### Task 2.1 localStorage 저수준 래퍼 + 프로필/플래그 CRUD
- Description: `safeGet<T>(key, fallback)` / `safeSet(key, value): StorageResult` 구현. parse 실패 시 해당 키 `removeItem` 후 fallback 반환, QuotaExceededError는 catch해 `{ ok: false, reason: 'quota' }` 반환(throw·console.error 금지). 이 위에 `getProfile/saveProfile`, `getFlags/saveFlags/patchFlags` 구현. `LS_KEYS` 상수 정의.
- DoD:
  - `saveProfile(p)` 후 `getProfile()`이 동일 객체 반환 (F1-AC1)
  - `fitcoach:sessions`에 `"{잘못된json"` 주입 후 `safeGet`이 예외 없이 fallback 반환 + 키 제거 (F1-AC4)
  - 키 없음 상태에서 `getProfile() === null`, `getFlags()`가 기본값 `{ aiNoticeAcknowledged: false, onboardingDone: false, isPremium: false, premiumUntil: null }` 반환 (F1-AC5)
  - 전 경로에 `console.error` 호출 0개 (grep으로 검증) (F1-AC6)
  - `setItem` mock이 QuotaExceededError를 던져도 throw 없이 `{ ok: false, reason: 'quota' }` 반환
- Covers: [F1-AC1, F1-AC4, F1-AC5, F1-AC6]
- Files: [`src/lib/storage.ts`]
- Depends on: Task 1.1

### Task 2.2 세션/리포트 저장소 (200개 상한 + quota 재시도)
- Description: `getSessions/addSession/getSessionById`, `getReports/saveReport/getReportBySessionId` 구현. addSession은 배열 길이 200 초과 시 `startedAt` 최소값부터 제거. `safeSet`이 quota 실패 반환 시 오래된 세션 20개 제거 후 1회 재시도, 그래도 실패면 `{ ok: false, reason: 'quota' }` 반환.
- DoD:
  - 세션 200개 상태에서 `addSession(new)` → 배열 길이 200 유지, 최소 `startedAt` 항목 부재, 신규 존재 (F1-AC2)
  - quota 던지는 mock에서 `addSession` → 20개 제거 후 재시도 로직 실행, 최종 실패 시 throw 없이 `{ ok: false, reason: 'quota' }` (F1-AC3)
  - `getSessions()`가 손상 JSON에서 `[]` 반환
  - `getReportBySessionId('없는id')`가 `undefined` 반환
  - `console.error` 0개
- Covers: [F1-AC2, F1-AC3, F1-AC4]
- Files: [`src/lib/storage.sessions.ts`]
- Depends on: Task 2.1

### Task 2.3 플랜/챌린지 저장소
- Description: `getPlans/savePlan/getPlanForWeek(weekOf)` (최근 8주 유지, 초과 시 오래된 것 제거) + `getThisWeekMonday(): string` 유틸. `getChallenges/joinChallenge/completeToday/generateShareCode` 구현 — completeToday는 오늘 날짜가 이미 있으면 배열 변경 없이 `{ ok: true, changed: false }` 반환. shareCode는 6자리 영숫자.
- DoD:
  - `savePlan` 9개 저장 → `getPlans().length === 8`, 가장 오래된 `weekOf` 제거됨
  - `getPlanForWeek(getThisWeekMonday())`가 이번 주 플랜 반환, 없으면 `undefined` (F3-AC7 근거)
  - `getThisWeekMonday()`가 항상 월요일 `"YYYY-MM-DD"` 반환 (일요일 입력 케이스 포함 검증)
  - `joinChallenge` 시 `/^[A-Za-z0-9]{6}$/` 매칭 shareCode 생성 (F7-AC1)
  - 동일 날짜 `completeToday` 2회 호출 → `completedDates.length` 증가 없음, 2번째 호출은 `changed: false` (F7-AC4)
  - `console.error` 0개
- Covers: [F1-AC2(상한 패턴), F3-AC7, F7-AC1, F7-AC4]
- Files: [`src/lib/storage.plans.ts`, `src/lib/storage.challenges.ts`, `src/lib/date.ts`]
- Depends on: Task 2.1

---

## Epic 3. State & API Client

**Risk Assessment**
- Complexity: Medium
- Risk factors: `isPremium` 상태가 여러 화면(홈 배너, 플랜 광고 게이트, 운동 잠금, 프리미엄 화면)에 흩어지면 F8-AC2(전역 반영) 불가. Railway API 무제한 대기 → 무한 스피너(Open Question 2).
- Mitigation: 프리미엄/플래그를 단일 Context(3.1)로 확정한 뒤 페이지 패킷을 시작. API 클라이언트(3.2)에 타임아웃과 통일 에러 타입을 캡슐화해 F3-AC5/F5-AC5가 페이지마다 재구현되지 않게 함.

### Task 3.1 AppContext (플래그 · 프로필 · 프리미엄 만료 검사)
- Description: `AppProvider` + `useApp()` 훅. 마운트 시 storage에서 flags/profile 로드하고 `premiumUntil < Date.now()`면 `isPremium = false`로 갱신 후 저장. `setPremium(untilTs)`, `acknowledgeAiNotice()`, `refreshProfile()` 제공. `main.tsx`에서 앱을 Provider로 감쌈.
- DoD:
  - `flags.premiumUntil`이 과거인 상태로 앱 진입 → `useApp().flags.isPremium === false`이고 localStorage에도 반영 (F8-AC4)
  - `useApp().isPremium`이 모든 하위 컴포넌트에서 동일 값 참조(단일 소스)
  - `acknowledgeAiNotice()` 호출 → `flags.aiNoticeAcknowledged = true` 저장 및 재렌더
  - Provider 밖에서 `useApp()` 호출 시 명확한 에러 throw
  - 앱이 컴파일되고 기존 화면 정상 렌더
- Covers: [F8-AC2, F8-AC4, F2-AC1(플래그 소스)]
- Files: [`src/lib/AppContext.tsx`, `src/main.tsx`]
- Depends on: Task 2.1

### Task 3.2 AI API 클라이언트 (plan · report)
- Description: `postPlan(req: PlanRequest): Promise<Result<PlanResponse>>`, `postReport(req: ReportRequest): Promise<Result<ReportResponse>>` 구현. base URL은 `import.meta.env.VITE_API_BASE_URL`. `AbortController`로 15초 타임아웃. 4xx/5xx/네트워크/타임아웃을 모두 `{ ok: false, error: string }`로 정규화(throw 금지). 응답 `Access-Control-Allow-Origin` 전제(요청은 `mode: 'cors'`, 커스텀 헤더 최소화로 preflight 회피 — `Content-Type: application/json`만).
- DoD:
  - 200 응답 → `{ ok: true, data }` 반환, 필드 `exerciseIds`/`summary` 존재 검증
  - 500 응답 → `{ ok: false, error: '플랜 생성에 실패했어요. 다시 시도해주세요' }` (throw 없음) (F3-AC5)
  - 네트워크 거부(fetch reject) → 동일하게 `{ ok: false }` 반환, 앱 크래시 없음 (F5-AC5)
  - 15초 초과 → abort 후 `{ ok: false, error: ... }` 반환
  - `mode: 'cors'` 명시 및 커스텀 헤더 미사용 확인 (F3-AC6)
  - `.env.example`에 `VITE_API_BASE_URL` 추가
- Covers: [F3-AC5, F3-AC6, F5-AC5]
- Files: [`src/lib/api.ts`, `.env.example`]
- Depends on: Task 1.1

### Task 3.3 프로모션 리워드 유틸 (5,000원 클램프)
- Description: `grantPromo(promotionCode: string, amount: number)` 래퍼. `Math.min(amount, 5000)`으로 클램프 후 `grantPromotionReward({ promotionCode, amount })` 호출. 실패는 `{ ok: false }`로 정규화(throw 금지).
- DoD:
  - `grantPromo('CODE', 9999)` 호출 시 SDK에 전달된 `amount === 5000` (mock으로 검증) (F3-AC8)
  - `grantPromo('CODE', 3000)` → `amount === 3000` 그대로 전달
  - SDK가 reject해도 throw 없이 `{ ok: false }` 반환, `console.error` 0개
  - `grantPromotionReward`는 `@apps-in-toss/web-framework`에서 직접 import
- Covers: [F3-AC8]
- Files: [`src/lib/promo.ts`]
- Depends on: Task 1.1

---

## Epic 4. Pose Engine (온디바이스)

**Risk Assessment**
- Complexity: High
- Risk factors: MediaPipe/MoveNet 모델 로딩 실패·iOS 16 Safari 프레임 저하(Open Question 1). `getUserMedia` 트랙 미해제 시 카메라 표시등 상시 점등(F4-AC7 위반). SpeechSynthesis 미지원 기기 크래시.
- Mitigation: 포즈 로직을 UI에서 분리한 훅으로 먼저 구현해 세션 페이지(5.4)가 얇아지도록 함. 카메라 훅과 포즈 훅을 분리해 정리(cleanup) 책임을 한 곳에 고정. 음성은 feature-detect 폴백을 자체 모듈로 격리.

### Task 4.1 카메라 훅 + 음성 피드백 유틸
- Description: `useCamera()` — `getUserMedia({ video: { facingMode: 'user' } })` 요청, 상태 `'idle' | 'loading' | 'ready' | 'denied' | 'unsupported'` 노출, 언마운트 시 모든 트랙 `stop()`. `speak(text)` — `window.speechSynthesis` feature-detect, 미지원 시 no-op(throw 금지), 동일 문구 3초 내 재발화 차단(내부 타임스탬프 맵).
- DoD:
  - 권한 거부 mock → 상태 `'denied'`, throw 없음 (F4-AC4)
  - `navigator.mediaDevices` 부재 → 상태 `'unsupported'`, 크래시 없음 (F4-AC8)
  - 훅 언마운트 → `track.stop()`이 모든 트랙에 대해 호출됨 (F4-AC7)
  - `speak('a')` 2회 연속 호출(3초 내) → `speechSynthesis.speak` 1회만 호출 (F4-AC2)
  - `window.speechSynthesis === undefined` 환경에서 `speak()` 호출해도 예외 없음 (F4-AC8)
- Covers: [F4-AC4, F4-AC7, F4-AC8, F4-AC2(중복 발화 차단)]
- Files: [`src/lib/useCamera.ts`, `src/lib/speech.ts`]
- Depends on: Task 1.1

### Task 4.2 포즈 추정 훅 + 각도/렙 카운트 로직
- Description: `usePose(videoEl, exercise)` — MoveNet(TF.js) 모델 지연 로드, 상태 `'loading' | 'ready' | 'error'`. 순수 함수 `calcAngle(a, b, c): number`(3점 각도)와 `RepCounter` 클래스(각도 min→max→min 사이클 감지) 분리 구현. JointRule 위반 시 `feedbackLow`/`feedbackHigh` 문자열과 프레임 폼 점수(0~100) 산출.
- DoD:
  - `calcAngle`이 직각 3점 입력에 `90 ± 1` 반환(단위 테스트)
  - `RepCounter`에 min→max→min 각도 시퀀스 주입 → `count === 1`; min→max만 주입 → `count === 0` (F4-AC3)
  - 각도 < `minAngle` 프레임 → `feedbackLow` 문자열 반환 (F4-AC2)
  - 모델 로드 실패 mock → 상태 `'error'`, throw 없음, `console.error` 0개 (F4-AC6)
  - 상태가 `'ready'` 이전에는 카운트/피드백 함수가 no-op (F4-AC6)
- Covers: [F4-AC2, F4-AC3, F4-AC6]
- Files: [`src/lib/usePose.ts`, `src/lib/pose.math.ts`]
- Depends on: Task 1.2, Task 4.1

---

## Epic 5. UI Pages

**Risk Assessment**
- Complexity: High
- Risk factors: TDS 컴포넌트에 Tailwind/인라인 여백을 덮어써 검수 반려. `data-testid` 누락으로 레이아웃 AC 실패. 100개 이상 세션 전체 DOM 렌더로 스크롤 저하. 광고 게이트를 프리미엄 유저에게도 노출.
- Mitigation: Epic 3의 `useApp()`/API 클라이언트를 선행 완료해 각 페이지는 렌더에만 집중. 페이지당 1패킷으로 쪼개 10분 내 완료 보장. 여백은 `Spacing`만, 색상은 `var(--tds-color-*)`만 사용을 각 DoD에 명시.

### Task 5.1 온보딩 페이지 `/onboarding`
- Description: AI 고지 AlertDialog(1회) + 프로필 폼(TextField·Chip) + 하단 고정 Button. 검증 후 `saveProfile` + `flags.onboardingDone = true` → Toast → `navigate('/', { replace: true })`.
- DoD:
  - `flags.aiNoticeAcknowledged === false` 진입 시 AlertDialog "이 서비스는 생성형 AI를 활용합니다" 표시, "확인" 탭 시 플래그 저장 후 재진입에 미표시 (F2-AC1)
  - 유효 폼 제출 → UserProfile 저장 + `onboardingDone = true` + Toast "프로필이 저장됐어요" + `navigate('/', { replace: true })` (F2-AC2)
  - `nickname: ""` 제출 → "닉네임을 입력해주세요" 인라인 에러, 저장/이동 없음 (F2-AC3)
  - `heightCm: 300` 제출 → "키는 120~220cm 사이로 입력해주세요" 표시, 저장 없음 (F2-AC4)
  - 나이·키·몸무게 TextField에 `inputMode="numeric"` 존재, 포커스 시 대상 필드 `scrollIntoView` (F2-AC5)
  - `flags.onboardingDone === true`로 진입 → 즉시 `navigate('/', { replace: true })` (F2-AC6)
  - 입력=TDS TextField, 성별/체력수준/목표=TDS Chip, 제출=TDS Button `display="block"`; 모든 터치 타깃 ≥ 44px; 여백은 `Spacing`만, HEX 하드코딩 0 (F2-AC7)
- Covers: [F2-AC1, F2-AC2, F2-AC3, F2-AC4, F2-AC5, F2-AC6, F2-AC7]
- Files: [`src/pages/Onboarding.tsx`]
- Depends on: Task 3.1, Task 2.1

### Task 5.2 홈 대시보드 `/`
- Description: 이번 주 총 칼로리 SummaryHero(CountUp) + 최근 7세션 폼 점수 Sparkline + AdSlot 배너 + 세션 히스토리 ListRow(가상 스크롤). 빈 상태 처리.
- DoD:
  - `data-testid="cal-hero"` SummaryHero(이번 주 칼로리 CountUp), `data-testid="score-trend"` Sparkline 렌더 (F6-AC1)
  - 세션 5개 → `startedAt` 내림차순 ListRow, 각 행에 날짜·운동명·폼점수 노출, 행 높이 ≥ 44px (F6-AC2)
  - 행 탭 → `navigate('/report/{sessionId}')`, `RouteState['/report/:sessionId']` 타입으로 state 전달 (F6-AC3)
  - 세션 0개 → Asset.ContentIcon + "아직 운동 기록이 없어요" + "운동 시작하기" 버튼(→ `/plan`) (F6-AC4)
  - 세션 100개 이상 → 가상 스크롤로 화면 밖 행 DOM 미생성(렌더된 ListRow 수 < 전체 수) (F6-AC5)
  - `avgFormScore` 누락 세션 포함 시 NaN 미표시(0 처리), `console.error` 0개 (F6-AC7)
  - `isPremium === false`일 때만 AdSlot 렌더, 위치는 지표 카드와 히스토리 사이 (F6-AC6, F8-AC2)
- Covers: [F6-AC1, F6-AC2, F6-AC3, F6-AC4, F6-AC5, F6-AC6, F6-AC7, F8-AC2]
- Files: [`src/pages/Home.tsx`, `src/components/SummaryHero.tsx`, `src/components/Sparkline.tsx`]
- Depends on: Task 2.2, Task 3.1, Task 1.1

### Task 5.3 개인화 플랜 페이지 `/plan`
- Description: 이번 주 캐시 확인 → 없으면 "플랜 만들기" CTA. 무료 유저는 `<TossRewardAd>` 게이트 통과 후 `postPlan` 호출, 프리미엄은 즉시 호출. 결과는 운동 Card 목록 + AI 요약 + AI 배지.
- DoD:
  - 무료 유저: "플랜 만들기" → TossRewardAd 시청 완료 → `postPlan` 호출 → 응답 `savePlan` 저장 + 운동 카드 목록 + AI 요약 표시 (F3-AC1)
  - 플랜 카드 상단에 "AI가 생성한 결과입니다" TDS Chip/Badge 표시 (F3-AC2)
  - `isPremium === true` → TossRewardAd 미렌더, 탭 즉시 API 호출 (F3-AC3, F8-AC2)
  - API pending → 스켈레톤 + "플랜을 만드는 중..." 표시, CTA 버튼 `disabled` (F3-AC4)
  - `postPlan`이 `{ ok: false }` → 에러 배너 "플랜 생성에 실패했어요. 다시 시도해주세요" + "다시 시도" 버튼, 크래시 없음 (F3-AC5)
  - `getPlanForWeek(getThisWeekMonday())` 존재 → API 미호출, 저장 플랜 즉시 표시 + "이번 주 플랜" 라벨 (F3-AC7)
  - 운동 카드 탭 → `navigate('/workout/{exerciseId}', { state: { exerciseId } })` (RouteState 준수), 탭 영역 ≥ 44px
- Covers: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC7, F8-AC2]
- Files: [`src/pages/Plan.tsx`]
- Depends on: Task 3.1, Task 3.2, Task 2.3, Task 1.2

### Task 5.4 운동 세션 페이지 `/workout/:exerciseId`
- Description: `useParams().exerciseId`로 운동 조회. 무료 유저 + `isFree === false` → BottomSheet 잠금(카메라 미실행). 그 외 `useCamera` + `usePose`로 프리뷰·오버레이·렙 카운트·피드백 렌더. 종료 시 WorkoutSession 저장 후 리포트로 이동.
- DoD:
  - 권한 허용 → video 프리뷰 + 포즈 오버레이 canvas 렌더 (F4-AC1)
  - 각도 위반 프레임 → `feedbackLow` 텍스트 화면 표시 + `speak()` 1회 호출(3초 내 중복 없음) (F4-AC2)
  - 렙 사이클 감지 → 카운트 +1; "종료" 탭 → `avgFormScore`·`caloriesBurned` 포함 WorkoutSession `addSession` 저장 후 `navigate('/report/{sessionId}', { state: { sessionId } })` (F4-AC3)
  - 권한 거부(`useCamera` = `'denied'`) → "카메라 권한이 필요해요. 설정에서 허용해주세요" + "홈으로" 버튼, 크래시 없음 (F4-AC4)
  - `isPremium === false` && `exercise.isFree === false` → BottomSheet "프리미엄 전용 운동이에요" + "구독하기"(→ `/premium`, state `{ from: '/workout/...' }`), `getUserMedia` 미호출 (F4-AC5)
  - `usePose` 상태 `'loading'` → "AI 분석 준비 중...", 카운트/피드백 미동작 (F4-AC6)
  - 언마운트/뒤로가기 → MediaStream 트랙 `stop()` 호출 (F4-AC7)
  - `unsupported` 환경 → 텍스트 피드백만으로 동작, 크래시 없음 (F4-AC8)
  - 종료/닫기 버튼 ≥ 44px, 커스텀 CSS는 video/canvas flex 레이아웃에만 사용
- Covers: [F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC6, F4-AC7, F4-AC8]
- Files: [`src/pages/Workout.tsx`]
- Depends on: Task 4.1, Task 4.2, Task 2.2, Task 3.1

### Task 5.5 AI 리포트 페이지 `/report/:sessionId`
- Description: `useParams().sessionId`로 세션·캐시 리포트 조회. 캐시 있으면 즉시 표시, 없으면 무료 유저는 TossRewardAd 게이트 후 `postReport` 호출 → `saveReport`. SummaryHero(폼점수 CountUp) + MiniBar(근육 활성도) + 개선점 Card.
- DoD:
  - 무료 유저 + 캐시 없음: "리포트 보기" → TossRewardAd 완료 → `postReport` 호출 → 리포트 저장 + SummaryHero(formScore CountUp) + 개선점 카드 표시 (F5-AC1)
  - 리포트 상단에 "AI가 생성한 결과입니다" 배지 (F5-AC2)
  - `data-testid="report-hero"` SummaryHero, `data-testid="muscle-bar"` MiniBar 존재, 폼 점수는 TDS 타이포 t2 (F5-AC3)
  - API pending → 스켈레톤 카드 3개 + "분석 리포트 작성 중..." (F5-AC4)
  - `postReport` `{ ok: false }` → "리포트를 못 만들었어요. 다시 시도해주세요" + "다시 시도" 버튼, `fitcoach:sessions`의 해당 세션 유지 (F5-AC5)
  - 존재하지 않는 `sessionId` → "리포트를 찾을 수 없어요" + "기록으로" 버튼(→ `/`), 크래시 없음 (F5-AC6)
  - `getReportBySessionId(id)` 존재 → API·광고 없이 즉시 표시 (F5-AC7)
  - `isPremium === true` → TossRewardAd 미렌더 (F8-AC2); 하단 "기록 보기" Button ≥ 44px → `navigate('/', { replace: true })`
- Covers: [F5-AC1, F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6, F5-AC7, F8-AC2]
- Files: [`src/pages/Report.tsx`, `src/components/MiniBar.tsx`]
- Depends on: Task 2.2, Task 3.1, Task 3.2, Task 5.2

### Task 5.6 챌린지 페이지 `/challenges`
- Description: 사전 정의 챌린지 목록 + 참여/오늘 완료/공유. 진행률 MiniBar, 달성 시 AlertDialog. 클립보드 공유만(외부 이동 없음).
- DoD:
  - "참여하기" 탭 → 6자리 영숫자 `shareCode` 생성된 Challenge 저장 + 참여 목록에 표시 (F7-AC1)
  - "오늘 완료" 탭 → `completedDates`에 오늘 날짜 추가, 진행률 바 `completedDates.length / targetDays` 갱신 (F7-AC2)
  - "공유" 탭 → `navigator.clipboard.writeText(shareCode)` 후 Toast "코드가 복사됐어요", 외부 URL 이동 없음 (F7-AC3)
  - 오늘 이미 완료 후 재탭 → `completedDates` 변화 없음 + Toast "오늘은 이미 완료했어요" (F7-AC4)
  - 참여 챌린지 0개 → Asset.ContentIcon + "참여 중인 챌린지가 없어요" (F7-AC5)
  - 파일 내 `window.open` / `window.location.href` 문자열 0개 (grep 검증) (F7-AC6)
  - `completedDates.length === targetDays` 도달 → AlertDialog "챌린지 달성! 🎉", 진행률 100% (F7-AC7)
  - 참여/완료/공유 Button ≥ 44px
- Covers: [F7-AC1, F7-AC2, F7-AC3, F7-AC4, F7-AC5, F7-AC6, F7-AC7]
- Files: [`src/pages/Challenges.tsx`, `src/lib/challengeCatalog.ts`]
- Depends on: Task 2.3, Task 3.1

### Task 5.7 프리미엄 페이지 `/premium`
- Description: 혜택 Card + 가격 고지 + `<TossPurchase>` 결제. 성공 시 `processProductGrant`에서 `setPremium(Date.now() + 30일)`. 이미 프리미엄이면 상태 카드 표시.
- DoD:
  - `<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU} processProductGrant={...} onPurchased={...} />` 사용, 결제 완료 → `flags.isPremium = true`, `premiumUntil = Date.now() + 30*24*60*60*1000` 저장 + Toast "프리미엄이 활성화됐어요" (F8-AC1)
  - 결제 취소/실패 → `flags.isPremium` 불변 + Toast "결제가 취소됐어요", 크래시 없음 (F8-AC3)
  - `isPremium === true` 진입 → 결제 버튼 대신 "프리미엄 이용 중 (만료: YYYY-MM-DD)" 상태 카드 (F8-AC5)
  - 혜택 목록(전체 운동/실시간 교정/개인화 플랜)과 "월 12,900원"이 TDS `Paragraph.Text`로 명시, 앱 설치 유도 문구 0 (F8-AC6)
  - 결제 처리 중 버튼 `disabled` + 스피너; 결제 Button ≥ 44px
  - 성공 후 `navigate(-1)`; `location.state`는 `RouteState['/premium']` 타입으로 캐스팅
  - `.env.example`에 `VITE_TOSS_IAP_SKU` 추가
- Covers: [F8-AC1, F8-AC3, F8-AC5, F8-AC6]
- Files: [`src/pages/Premium.tsx`, `.env.example`]
- Depends on: Task 3.1

---

## Epic 6. Integration + Polish

**Risk Assessment**
- Complexity: Medium
- Risk factors: 온보딩 미완료 유저가 홈에 직접 진입해 profile null 크래시. FloatingTabBar가 카메라 화면(S4)이나 온보딩을 덮음. 광고/IAP 환경변수 미주입으로 검수 시 빈 배너. 하드코딩 HEX·Tailwind 여백 잔존 → 반려.
- Mitigation: 모든 페이지 완성 후 라우팅을 마지막에 배선해 각 페이지가 독립적으로 컴파일 가능한 상태 유지. 최종 준수 스윕(6.2)을 별도 패킷으로 분리해 TDS 규칙 위반을 배포 전 일괄 제거.

### Task 6.1 라우팅 배선 + 온보딩 가드 + FloatingTabBar
- Description: React Router 라우트 7개 등록(`/`, `/onboarding`, `/plan`, `/workout/:exerciseId`, `/report/:sessionId`, `/challenges`, `/premium`). `flags.onboardingDone === false`면 `/onboarding`으로 리다이렉트하는 가드. FloatingTabBar는 `/`·`/plan`·`/challenges`에서만 렌더.
- DoD:
  - 7개 라우트가 모두 정상 렌더, 정의되지 않은 경로 → `/`로 리다이렉트
  - `onboardingDone === false` 상태로 `/` 접근 → `/onboarding`으로 `replace` 리다이렉트 (F2-AC6 보완)
  - `onboardingDone === true` 상태로 `/onboarding` 접근 → `/`로 `replace` 리다이렉트 (F2-AC6)
  - FloatingTabBar가 `/workout/:exerciseId`, `/report/:sessionId`, `/onboarding`, `/premium`에서 미렌더
  - 모든 `navigate(path, { state })` 호출이 `RouteState`의 해당 키 타입과 일치(타입 캐스팅 없이 컴파일)
  - `tsc --noEmit` + `vite build` 통과
- Covers: [F2-AC6, F6-AC3]
- Files: [`src/App.tsx`, `src/router.tsx`]
- Depends on: Task 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7

### Task 6.2 최종 준수 스윕 (TDS · 광고 · 콘솔 · 환경변수)
- Description: 전체 소스에 대해 검수 반려 요인 일괄 제거. HEX 하드코딩 → `var(--tds-color-*)`, TDS 컴포넌트 위 Tailwind/인라인 여백 제거 → `Spacing`, 금지 라이브러리(shadcn/MUI/Ant/Chakra) 미사용 확인, 외부 로깅(GA/Amplitude) 미사용 확인, `console.error` 제거, 광고/IAP env 정리.
- DoD:
  - `grep -rE '#[0-9a-fA-F]{6}' src/` 결과 0건(TDS 토큰만 사용)
  - `grep -rE 'shadcn|@mui|antd|@chakra-ui|gtag|amplitude' src/ package.json` 결과 0건
  - `grep -rn 'console.error' src/` 결과 0건 (F1-AC6)
  - AdSlot이 `isPremium === false`일 때만 렌더됨을 전 페이지에서 확인(홈 배너 1곳) (F8-AC2)
  - `.env.example`에 `VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID`, `VITE_TOSS_IAP_SKU`, `VITE_API_BASE_URL` 4개 모두 존재하며 코드는 `import.meta.env`로만 참조(하드코딩 0)
  - 모든 인터랙티브 요소 min-height/width ≥ 44px
  - 프로덕션 빌드 실행 시 콘솔 에러 0개 (F1-AC6, F6-AC7)
- Covers: [F1-AC6, F6-AC6, F6-AC7, F8-AC2]
- Files: [`src/**/*.tsx`, `src/**/*.ts`, `.env.example`]
- Depends on: Task 6.1

---

## AC Coverage

- **Total ACs in SPEC: 48**
  - F1: 6 · F2: 7 · F3: 8 · F4: 8 · F5: 7 · F6: 7 · F8: 6 · F7: 7 → 6+7+8+8+7+7+7+6 = **48**

- **Covered by tasks: 48**

| Feature | AC | Task |
|---|---|---|
| F1 | AC1 | 1.1, 2.1 |
| F1 | AC2 | 2.2, 2.3 |
| F1 | AC3 | 2.2 |
| F1 | AC4 | 2.1, 2.2 |
| F1 | AC5 | 2.1 |
| F1 | AC6 | 2.1, 2.2, 2.3, 6.2 |
| F2 | AC1 | 3.1, 5.1 |
| F2 | AC2 | 5.1 |
| F2 | AC3 | 5.1 |
| F2 | AC4 | 5.1 |
| F2 | AC5 | 5.1 |
| F2 | AC6 | 5.1, 6.1 |
| F2 | AC7 | 5.1 |
| F3 | AC1 | 1.1, 5.3 |
| F3 | AC2 | 5.3 |
| F3 | AC3 | 5.3 |
| F3 | AC4 | 5.3 |
| F3 | AC5 | 3.2, 5.3 |
| F3 | AC6 | 3.2 |
| F3 | AC7 | 2.3, 5.3 |
| F3 | AC8 | 3.3 |
| F4 | AC1 | 5.4 |
| F4 | AC2 | 1.2, 4.1, 4.2, 5.4 |
| F4 | AC3 | 4.2, 5.4 |
| F4 | AC4 | 4.1, 5.4 |
| F4 | AC5 | 1.2, 5.4 |
| F4 | AC6 | 4.2, 5.4 |
| F4 | AC7 | 4.1, 5.4 |
| F4 | AC8 | 4.1, 5.4 |
| F5 | AC1 | 1.1, 5.5 |
| F5 | AC2 | 5.5 |
| F5 | AC3 | 5.5 |
| F5 | AC4 | 5.5 |
| F5 | AC5 | 3.2, 5.5 |
| F5 | AC6 | 5.5 |
| F5 | AC7 | 5.5 |
| F6 | AC1 | 5.2 |
| F6 | AC2 | 5.2 |
| F6 | AC3 | 5.2, 6.1 |
| F6 | AC4 | 5.2 |
| F6 | AC5 | 5.2 |
| F6 | AC6 | 5.2, 6.2 |
| F6 | AC7 | 5.2, 6.2 |
| F7 | AC1 | 2.3, 5.6 |
| F7 | AC2 | 5.6 |
| F7 | AC3 | 5.6 |
| F7 | AC4 | 2.3, 5.6 |
| F7 | AC5 | 5.6 |
| F7 | AC6 | 5.6 |
| F7 | AC7 | 5.6 |
| F8 | AC1 | 5.7 |
| F8 | AC2 | 3.1, 5.2, 5.3, 5.5, 6.2 |
| F8 | AC3 | 5.7 |
| F8 | AC4 | 3.1 |
| F8 | AC5 | 5.7 |
| F8 | AC6 | 5.7 |

- **Uncovered: 0** ✅

---

## 총 15 태스크 (Epic 1: 2 · Epic 2: 3 · Epic 3: 3 · Epic 4: 2 · Epic 5: 7 · Epic 6: 2)

**Critical path**: 1.1 → 2.1 → 3.1 → 5.x → 6.1 → 6.2
**병렬 가능**: Task 1.2 / 3.2 / 3.3은 1.1 완료 후 즉시 병렬 착수 가능. Epic 5의 7개 페이지는 Epic 3·4 완료 후 전부 병렬 가능.
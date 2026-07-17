import type { Exercise } from './types';

// Free exercises (3)
const squat: Exercise = {
  id: 'squat',
  name: '스쿼트',
  targetMuscle: '하체',
  difficulty: 'beginner',
  isFree: true,
  keyJoints: [
    {
      joint: 'knee',
      minAngle: 70,
      maxAngle: 120,
      feedbackLow: '무릎을 더 굽히세요',
      feedbackHigh: '무릎을 너무 굽혔어요',
    },
    {
      joint: 'hip',
      minAngle: 60,
      maxAngle: 110,
      feedbackLow: '엉덩이를 더 내리세요',
      feedbackHigh: '엉덩이를 너무 내렸어요',
    },
    {
      joint: 'back',
      minAngle: 80,
      maxAngle: 100,
      feedbackLow: '등을 더 세우세요',
      feedbackHigh: '등을 과하게 굽혔어요',
    },
  ],
  guideText: '발을 어깨 너비로 벌리고 시선은 정면을 향합니다. 등을 펴고 천천히 앉듯이 내려갑니다.',
};

const pushup: Exercise = {
  id: 'pushup',
  name: '푸시업',
  targetMuscle: '상체',
  difficulty: 'intermediate',
  isFree: true,
  keyJoints: [
    {
      joint: 'elbow',
      minAngle: 30,
      maxAngle: 90,
      feedbackLow: '팔을 더 굽혀주세요',
      feedbackHigh: '팔을 너무 많이 굽히지 마세요',
    },
    {
      joint: 'shoulder',
      minAngle: 70,
      maxAngle: 110,
      feedbackLow: '어깨가 떨어져 있습니다. 더 모으세요',
      feedbackHigh: '어깨가 너무 떨어졌습니다',
    },
    {
      joint: 'back',
      minAngle: 175,
      maxAngle: 180,
      feedbackLow: '몸이 처져 있습니다. 더 펴세요',
      feedbackHigh: '몸의 일직선이 유지되고 있습니다',
    },
  ],
  guideText: '양손을 어깨 너비로 벌리고 몸을 일직선으로 유지합니다. 팔꿈치가 몸통 근처에 있도록 내려갑니다.',
};

const plank: Exercise = {
  id: 'plank',
  name: '플랭크',
  targetMuscle: '코어',
  difficulty: 'beginner',
  isFree: true,
  keyJoints: [
    {
      joint: 'back',
      minAngle: 175,
      maxAngle: 180,
      feedbackLow: '엉덩이가 내려왔습니다. 올려주세요',
      feedbackHigh: '몸이 일직선을 유지하고 있습니다',
    },
    {
      joint: 'shoulder',
      minAngle: 85,
      maxAngle: 95,
      feedbackLow: '어깨가 앞으로 나갔습니다. 뒤로 당겨주세요',
      feedbackHigh: '어깨 위치가 좋습니다',
    },
    {
      joint: 'hip',
      minAngle: 175,
      maxAngle: 180,
      feedbackLow: '골반이 처지고 있습니다. 들어올려주세요',
      feedbackHigh: '골반 높이가 유지되고 있습니다',
    },
  ],
  guideText: '팔꿈치를 어깨 아래에 두고 몸 전체를 일직선으로 유지합니다. 팔꿈치와 발끝으로 몸을 지탱합니다.',
};

// Paid exercises (3)
const lunge: Exercise = {
  id: 'lunge',
  name: '런지',
  targetMuscle: '하체',
  difficulty: 'intermediate',
  isFree: false,
  keyJoints: [
    {
      joint: 'knee',
      minAngle: 70,
      maxAngle: 110,
      feedbackLow: '무릎을 더 굽혀주세요',
      feedbackHigh: '무릎을 너무 굽히지 마세요',
    },
    {
      joint: 'hip',
      minAngle: 80,
      maxAngle: 120,
      feedbackLow: '엉덩이를 더 내리세요',
      feedbackHigh: '엉덩이를 너무 내렸습니다',
    },
    {
      joint: 'back',
      minAngle: 85,
      maxAngle: 95,
      feedbackLow: '등을 세워주세요',
      feedbackHigh: '등이 과하게 굽어졌습니다',
    },
  ],
  guideText: '한 발은 앞으로, 한 발은 뒤로 큰 보폭으로 서서 앞쪽 무릎을 굽혀 내려갑니다. 등은 항상 펴진 상태를 유지하세요.',
};

const burpee: Exercise = {
  id: 'burpee',
  name: '버피',
  targetMuscle: '전신',
  difficulty: 'advanced',
  isFree: false,
  keyJoints: [
    {
      joint: 'elbow',
      minAngle: 20,
      maxAngle: 90,
      feedbackLow: '팔을 완전히 펴주세요',
      feedbackHigh: '팔 각도가 좋습니다',
    },
    {
      joint: 'knee',
      minAngle: 0,
      maxAngle: 120,
      feedbackLow: '점프 높이를 올려주세요',
      feedbackHigh: '점프 높이가 적절합니다',
    },
    {
      joint: 'back',
      minAngle: 170,
      maxAngle: 180,
      feedbackLow: '몸의 일직선을 유지하세요',
      feedbackHigh: '몸이 완벽한 일직선입니다',
    },
  ],
  guideText: '서서 시작해서 쪼그려 앉고 양손을 땅에 짚어 플랭크 자세로 전환하고 다시 일어나 점프합니다.',
};

const mountainclimber: Exercise = {
  id: 'mountainclimber',
  name: '마운틴클라이머',
  targetMuscle: '코어/하체',
  difficulty: 'advanced',
  isFree: false,
  keyJoints: [
    {
      joint: 'hip',
      minAngle: 40,
      maxAngle: 90,
      feedbackLow: '무릎을 가슴에 더 끌어당기세요',
      feedbackHigh: '무릎을 너무 높이 들지 마세요',
    },
    {
      joint: 'back',
      minAngle: 175,
      maxAngle: 180,
      feedbackLow: '엉덩이가 올라갔습니다. 내려주세요',
      feedbackHigh: '몸이 일직선을 유지하고 있습니다',
    },
    {
      joint: 'shoulder',
      minAngle: 85,
      maxAngle: 95,
      feedbackLow: '어깨가 앞으로 나갔습니다',
      feedbackHigh: '어깨 위치가 좋습니다',
    },
  ],
  guideText: '플랭크 자세에서 시작해 무릎을 가슴 쪽으로 번갈아 끌어당기며 빠르게 동작합니다. 엉덩이 높이를 유지하세요.',
};

// Catalog array
export const exercises: Exercise[] = [squat, pushup, plank, lunge, burpee, mountainclimber];

// Helper functions
export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find((ex) => ex.id === id);
}

export function getAllExercises(): Exercise[] {
  return exercises;
}

export function getFreeExercises(): Exercise[] {
  return exercises.filter((ex) => ex.isFree === true);
}

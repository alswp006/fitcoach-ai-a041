import { describe, it, expect } from 'vitest';
import type { Exercise } from '@/lib/types';

describe('Exercise 정적 카탈로그 (packet 0002)', () => {
  // Import the exercises and helper functions
  // NOTE: These will fail initially (TDD red phase)
  let exercises: Exercise[];
  let getExerciseById: (id: string) => Exercise | undefined;
  let getAllExercises: () => Exercise[];
  let getFreeExercises: () => Exercise[];

  // AC-1: src/lib/exercises.ts가 Exercise[] 타입으로 6개 운동을 export한다
  describe('AC-1: 카탈로그 구조', () => {
    it('should export 6 exercises as Exercise[] type', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      expect(exercises).toBeDefined();
      expect(Array.isArray(exercises)).toBe(true);
      expect(exercises.length).toBe(6);
    });

    it('should have required Exercise fields on each item', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      exercises.forEach((exercise) => {
        expect(exercise.id).toBeDefined();
        expect(typeof exercise.id).toBe('string');
        expect(exercise.id.length).toBeGreaterThan(0);

        expect(exercise.name).toBeDefined();
        expect(typeof exercise.name).toBe('string');

        expect(exercise.targetMuscle).toBeDefined();
        expect(typeof exercise.targetMuscle).toBe('string');

        expect(['beginner', 'intermediate', 'advanced']).toContain(exercise.difficulty);

        expect(typeof exercise.isFree).toBe('boolean');

        expect(Array.isArray(exercise.keyJoints)).toBe(true);
        expect(exercise.keyJoints.length).toBeGreaterThan(0);

        expect(exercise.guideText).toBeDefined();
        expect(typeof exercise.guideText).toBe('string');
      });
    });
  });

  // AC-2: isFree === true인 항목이 정확히 3개다
  describe('AC-2: 무료/유료 분류', () => {
    it('should have exactly 3 free exercises', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      const freeExercises = exercises.filter((e) => e.isFree === true);
      expect(freeExercises.length).toBe(3);
    });

    it('should have exactly 3 paid exercises', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      const paidExercises = exercises.filter((e) => e.isFree === false);
      expect(paidExercises.length).toBe(3);
    });

    it('should include free exercises: squat, pushup, plank', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      const freeIds = exercises.filter((e) => e.isFree).map((e) => e.id);
      expect(freeIds).toContain('squat');
      expect(freeIds).toContain('pushup');
      expect(freeIds).toContain('plank');
    });

    it('should include paid exercises: lunge, burpee, mountainclimber', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      const paidIds = exercises.filter((e) => !e.isFree).map((e) => e.id);
      expect(paidIds).toContain('lunge');
      expect(paidIds).toContain('burpee');
      expect(paidIds).toContain('mountainclimber');
    });
  });

  // AC-3: 모든 JointRule에서 minAngle < maxAngle이고 feedbackLow/feedbackHigh가 한국어 문자열이다
  describe('AC-3: JointRule 검증', () => {
    it('should have valid angle ranges for all joint rules', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      exercises.forEach((exercise) => {
        exercise.keyJoints.forEach((rule) => {
          expect(rule.minAngle).toBeLessThan(rule.maxAngle);
          expect(rule.minAngle).toBeGreaterThanOrEqual(0);
          expect(rule.maxAngle).toBeLessThanOrEqual(180);
        });
      });
    });

    it('should have Korean feedback strings for all joint rules', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      const koreanRegex = /[가-힯]/; // 한글 범위

      exercises.forEach((exercise) => {
        exercise.keyJoints.forEach((rule) => {
          expect(rule.feedbackLow).toBeDefined();
          expect(typeof rule.feedbackLow).toBe('string');
          expect(rule.feedbackLow.length).toBeGreaterThan(0);
          expect(koreanRegex.test(rule.feedbackLow)).toBe(true);

          expect(rule.feedbackHigh).toBeDefined();
          expect(typeof rule.feedbackHigh).toBe('string');
          expect(rule.feedbackHigh.length).toBeGreaterThan(0);
          expect(koreanRegex.test(rule.feedbackHigh)).toBe(true);
        });
      });
    });

    it('should have valid joint types', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      const validJoints = ['knee', 'hip', 'elbow', 'shoulder', 'back'];

      exercises.forEach((exercise) => {
        exercise.keyJoints.forEach((rule) => {
          expect(validJoints).toContain(rule.joint);
        });
      });
    });

    it('should have Korean guideText for all exercises', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      const koreanRegex = /[가-힯]/;

      exercises.forEach((exercise) => {
        expect(exercise.guideText.length).toBeGreaterThan(0);
        expect(koreanRegex.test(exercise.guideText)).toBe(true);
      });
    });
  });

  // AC-4: getExerciseById('unknown')이 throw 없이 undefined를 반환한다
  describe('AC-4: 조회 헬퍼 함수', () => {
    it('getExerciseById should return undefined for unknown id without throwing', async () => {
      const module = await import('@/lib/exercises');
      getExerciseById = module.getExerciseById;

      const result = getExerciseById('unknown');
      expect(result).toBeUndefined();
    });

    it('getExerciseById should return correct exercise for valid id', async () => {
      const module = await import('@/lib/exercises');
      getExerciseById = module.getExerciseById;

      const squat = getExerciseById('squat');
      expect(squat).toBeDefined();
      expect(squat?.id).toBe('squat');
      expect(squat?.isFree).toBe(true);
      expect(squat?.name).toBeDefined();
      expect(squat?.keyJoints.length).toBeGreaterThan(0);
    });

    it('getExerciseById should return same object reference for same id', async () => {
      const module = await import('@/lib/exercises');
      getExerciseById = module.getExerciseById;

      const squat1 = getExerciseById('squat');
      const squat2 = getExerciseById('squat');
      expect(squat1).toBe(squat2);
    });

    it('getAllExercises should return all 6 exercises', async () => {
      const module = await import('@/lib/exercises');
      getAllExercises = module.getAllExercises;

      const all = getAllExercises();
      expect(all.length).toBe(6);
      expect(all.map((e) => e.id)).toContain('squat');
      expect(all.map((e) => e.id)).toContain('pushup');
      expect(all.map((e) => e.id)).toContain('plank');
      expect(all.map((e) => e.id)).toContain('lunge');
      expect(all.map((e) => e.id)).toContain('burpee');
      expect(all.map((e) => e.id)).toContain('mountainclimber');
    });

    it('getFreeExercises should return exactly 3 free exercises', async () => {
      const module = await import('@/lib/exercises');
      getFreeExercises = module.getFreeExercises;

      const free = getFreeExercises();
      expect(free.length).toBe(3);
      expect(free.every((e) => e.isFree === true)).toBe(true);
      expect(free.map((e) => e.id)).toContain('squat');
      expect(free.map((e) => e.id)).toContain('pushup');
      expect(free.map((e) => e.id)).toContain('plank');
    });

    it('getFreeExercises should not include paid exercises', async () => {
      const module = await import('@/lib/exercises');
      getFreeExercises = module.getFreeExercises;

      const free = getFreeExercises();
      const freeIds = free.map((e) => e.id);
      expect(freeIds).not.toContain('lunge');
      expect(freeIds).not.toContain('burpee');
      expect(freeIds).not.toContain('mountainclimber');
    });
  });

  // Additional robustness tests
  describe('데이터 일관성', () => {
    it('should have unique exercise ids', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      const ids = exercises.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(6);
    });

    it('should have non-empty names for all exercises', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      exercises.forEach((exercise) => {
        expect(exercise.name.length).toBeGreaterThan(0);
      });
    });

    it('should have at least one joint rule per exercise', async () => {
      const module = await import('@/lib/exercises');
      exercises = module.exercises;

      exercises.forEach((exercise) => {
        expect(exercise.keyJoints.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});

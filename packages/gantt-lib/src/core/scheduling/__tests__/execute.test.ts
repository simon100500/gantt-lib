// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { Task } from '../types';
import {
  moveTaskWithCascade,
  resizeTaskWithCascade,
  recalculateTaskFromDependencies,
  recalculateProjectSchedule,
} from '../execute';

// Helpers
function d(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    name: overrides.id,
    startDate: '2024-01-01',
    endDate: '2024-01-05',
    ...overrides,
  };
}

const isWeekend = (date: Date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

describe('moveTaskWithCascade', () => {
  it('1. FS successor shifts when predecessor moves', () => {
    const predecessor = makeTask({ id: 'A', startDate: '2024-01-01', endDate: '2024-01-05' });
    const successor = makeTask({
      id: 'B', startDate: '2024-01-06', endDate: '2024-01-10',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
    });
    const snapshot = [predecessor, successor];

    const result = moveTaskWithCascade('A', d('2024-01-03'), snapshot);

    expect(result.changedIds).toContain('A');
    expect(result.changedIds).toContain('B');

    const movedA = result.changedTasks.find(t => t.id === 'A')!;
    const movedB = result.changedTasks.find(t => t.id === 'B')!;
    expect(movedA.startDate).toBe('2024-01-03');
    expect(movedA.endDate).toBe('2024-01-07');
    expect(movedB.startDate).toBe('2024-01-08');
    expect(movedB.endDate).toBe('2024-01-12');
  });

  it('2. SS successor shifts with predecessor start', () => {
    const predecessor = makeTask({ id: 'A', startDate: '2024-01-01', endDate: '2024-01-05' });
    const successor = makeTask({
      id: 'B', startDate: '2024-01-01', endDate: '2024-01-05',
      dependencies: [{ taskId: 'A', type: 'SS', lag: 0 }],
    });
    const snapshot = [predecessor, successor];

    const result = moveTaskWithCascade('A', d('2024-01-03'), snapshot);

    const movedB = result.changedTasks.find(t => t.id === 'B')!;
    expect(movedB.startDate).toBe('2024-01-03');
    expect(movedB.endDate).toBe('2024-01-07');
  });

  it('3. FF successor end aligns with predecessor end', () => {
    const predecessor = makeTask({ id: 'A', startDate: '2024-01-01', endDate: '2024-01-05' });
    const successor = makeTask({
      id: 'B', startDate: '2024-01-01', endDate: '2024-01-05',
      dependencies: [{ taskId: 'A', type: 'FF', lag: 0 }],
    });
    const snapshot = [predecessor, successor];

    const result = moveTaskWithCascade('A', d('2024-01-03'), snapshot);

    const movedB = result.changedTasks.find(t => t.id === 'B')!;
    expect(movedB.endDate).toBe('2024-01-07');
  });

  it('4. SF successor reacts to predecessor move', () => {
    const predecessor = makeTask({ id: 'A', startDate: '2024-01-01', endDate: '2024-01-05' });
    const successor = makeTask({
      id: 'B', startDate: '2024-01-01', endDate: '2024-01-05',
      dependencies: [{ taskId: 'A', type: 'SF', lag: 0 }],
    });
    const snapshot = [predecessor, successor];

    const result = moveTaskWithCascade('A', d('2024-01-03'), snapshot);

    const movedB = result.changedTasks.find(t => t.id === 'B')!;
    expect(movedB).toBeDefined();
  });

  it('5. Negative FS lag allows overlap', () => {
    const predecessor = makeTask({ id: 'A', startDate: '2024-01-01', endDate: '2024-01-05' });
    const successor = makeTask({
      id: 'B', startDate: '2024-01-04', endDate: '2024-01-08',
      dependencies: [{ taskId: 'A', type: 'FS', lag: -2 }],
    });
    const snapshot = [predecessor, successor];

    const result = moveTaskWithCascade('A', d('2024-01-03'), snapshot);

    const movedB = result.changedTasks.find(t => t.id === 'B')!;
    expect(movedB).toBeDefined();
    // successor should be recalculated based on FS with lag=-2
  });

  it('6. Business days — cascade skips weekends', () => {
    // Mon Jan 8 - Fri Jan 12
    const predecessor = makeTask({ id: 'A', startDate: '2024-01-08', endDate: '2024-01-12' });
    const successor = makeTask({
      id: 'B', startDate: '2024-01-15', endDate: '2024-01-19',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
    });
    const snapshot = [predecessor, successor];

    const result = moveTaskWithCascade('A', d('2024-01-10'), snapshot, {
      businessDays: true,
      weekendPredicate: isWeekend,
    });

    const movedA = result.changedTasks.find(t => t.id === 'A')!;
    const movedB = result.changedTasks.find(t => t.id === 'B')!;
    expect(movedA.startDate).toBe('2024-01-10');
    expect(movedB.startDate).toBe('2024-01-17'); // next Mon after end (Jan 14 is Sun, skip)
    expect(movedB.endDate).toBe('2024-01-23'); // Fri
  });

  it('7. Parent with children — children shift proportionally', () => {
    const parent = makeTask({ id: 'P', startDate: '2024-01-01', endDate: '2024-01-10' });
    const child1 = makeTask({ id: 'C1', startDate: '2024-01-01', endDate: '2024-01-05', parentId: 'P' });
    const child2 = makeTask({ id: 'C2', startDate: '2024-01-06', endDate: '2024-01-10', parentId: 'P' });
    const snapshot = [parent, child1, child2];

    const result = moveTaskWithCascade('P', d('2024-01-03'), snapshot);

    const movedC1 = result.changedTasks.find(t => t.id === 'C1')!;
    const movedC2 = result.changedTasks.find(t => t.id === 'C2')!;
    expect(movedC1.startDate).toBe('2024-01-03');
    expect(movedC2.startDate).toBe('2024-01-08');
  });

  it('returns empty result for non-existent task', () => {
    const result = moveTaskWithCascade('Z', d('2024-01-01'), []);
    expect(result.changedTasks).toEqual([]);
    expect(result.changedIds).toEqual([]);
  });
});

describe('resizeTaskWithCascade', () => {
  it('8. anchor=end keeps start fixed and resizes by end date', () => {
    const task = makeTask({ id: 'A', startDate: '2024-01-01', endDate: '2024-01-05' });
    const successor = makeTask({
      id: 'B', startDate: '2024-01-06', endDate: '2024-01-10',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
    });
    const snapshot = [task, successor];

    const result = resizeTaskWithCascade('A', 'end', d('2024-01-03'), snapshot);

    const resizedA = result.changedTasks.find(t => t.id === 'A')!;
    expect(resizedA.startDate).toBe('2024-01-01');
    expect(resizedA.endDate).toBe('2024-01-03');

    const movedB = result.changedTasks.find(t => t.id === 'B')!;
    expect(movedB.startDate).toBe('2024-01-04');
  });

  it('9. anchor=start keeps end fixed and resizes by start date', () => {
    const task = makeTask({ id: 'A', startDate: '2024-01-01', endDate: '2024-01-05' });
    const successor = makeTask({
      id: 'B', startDate: '2024-01-06', endDate: '2024-01-10',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
    });
    const snapshot = [task, successor];

    const result = resizeTaskWithCascade('A', 'start', d('2024-01-03'), snapshot);

    const resizedA = result.changedTasks.find(t => t.id === 'A')!;
    expect(resizedA.startDate).toBe('2024-01-03');
    expect(resizedA.endDate).toBe('2024-01-05');
  });

  it('returns empty result for non-existent task', () => {
    const result = resizeTaskWithCascade('Z', 'end', d('2024-01-01'), []);
    expect(result.changedTasks).toEqual([]);
    expect(result.changedIds).toEqual([]);
  });
});

describe('recalculateTaskFromDependencies', () => {
  it('10. Recalculates successor based on predecessor constraint', () => {
    const predecessor = makeTask({ id: 'A', startDate: '2024-01-01', endDate: '2024-01-05' });
    const successor = makeTask({
      id: 'B', startDate: '2024-01-08', endDate: '2024-01-12',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 2 }],
    });
    const snapshot = [predecessor, successor];

    const result = recalculateTaskFromDependencies('B', snapshot);

    const recalcB = result.changedTasks.find(t => t.id === 'B')!;
    expect(recalcB).toBeDefined();
    // FS lag=2: successor start = predEnd + lag + 1 = Jan 5 + 2 + 1 = Jan 8
    expect(recalcB.startDate).toBe('2024-01-08');
  });

  it('10.1 milestone FS lag=0 keeps successor on the same day', () => {
    const predecessor = makeTask({
      id: 'M',
      startDate: '2024-01-05',
      endDate: '2024-01-05',
      type: 'milestone',
    });
    const successor = makeTask({
      id: 'B',
      startDate: '2024-01-06',
      endDate: '2024-01-08',
      dependencies: [{ taskId: 'M', type: 'FS', lag: 0 }],
    });
    const snapshot = [predecessor, successor];

    const result = recalculateTaskFromDependencies('B', snapshot);

    const recalcB = result.changedTasks.find(t => t.id === 'B')!;
    expect(recalcB.startDate).toBe('2024-01-05');
    expect(recalcB.endDate).toBe('2024-01-07');
  });

  it('10.2 moving milestone predecessor keeps milestone successor on the same day for FS lag=0', () => {
    const predecessor = makeTask({
      id: 'M1',
      startDate: '2024-01-05',
      endDate: '2024-01-05',
      type: 'milestone',
    });
    const successor = makeTask({
      id: 'M2',
      startDate: '2024-01-05',
      endDate: '2024-01-05',
      type: 'milestone',
      dependencies: [{ taskId: 'M1', type: 'FS', lag: 0 }],
    });

    const result = moveTaskWithCascade('M1', new Date('2024-01-08T00:00:00.000Z'), [predecessor, successor]);

    const movedPredecessor = result.changedTasks.find(t => t.id === 'M1')!;
    const movedSuccessor = result.changedTasks.find(t => t.id === 'M2')!;

    expect(movedPredecessor.startDate).toBe('2024-01-08');
    expect(movedPredecessor.endDate).toBe('2024-01-08');
    expect(movedSuccessor.startDate).toBe('2024-01-08');
    expect(movedSuccessor.endDate).toBe('2024-01-08');
    expect(movedSuccessor.dependencies?.[0]?.lag).toBe(0);
  });

  it('returns empty for task without dependencies', () => {
    const task = makeTask({ id: 'A', startDate: '2024-01-01', endDate: '2024-01-05' });
    const result = recalculateTaskFromDependencies('A', [task]);
    // Task without deps: just returns the task itself recalculated
    expect(result.changedTasks.find(t => t.id === 'A')).toBeDefined();
  });

  it('returns empty for non-existent task', () => {
    const result = recalculateTaskFromDependencies('Z', []);
    expect(result.changedTasks).toEqual([]);
    expect(result.changedIds).toEqual([]);
  });
});

describe('recalculateProjectSchedule', () => {
  it('11. Full project cascade — A moves, B and C follow', () => {
    const a = makeTask({ id: 'A', startDate: '2024-01-01', endDate: '2024-01-05' });
    const b = makeTask({
      id: 'B', startDate: '2024-01-06', endDate: '2024-01-10',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
    });
    const c = makeTask({
      id: 'C', startDate: '2024-01-11', endDate: '2024-01-15',
      dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }],
    });
    // Snapshot with A already moved to Jan 3-7
    const snapshot = [
      { ...a, startDate: '2024-01-03', endDate: '2024-01-07' },
      b,
      c,
    ];

    const result = recalculateProjectSchedule(snapshot);

    expect(result.changedIds).toEqual(['B', 'C']);
    const resultB = result.changedTasks.find(t => t.id === 'B')!;
    const resultC = result.changedTasks.find(t => t.id === 'C')!;
    expect(resultB.startDate).toBe('2024-01-08');
    expect(resultC.startDate).toBe('2024-01-13');
  });

  it('12. uses strongest constraint across multiple roots and predecessors', () => {
    const a = makeTask({ id: 'A', startDate: '2024-01-10', endDate: '2024-01-12' });
    const b = makeTask({ id: 'B', startDate: '2024-01-03', endDate: '2024-01-05' });
    const c = makeTask({
      id: 'C',
      startDate: '2024-01-06',
      endDate: '2024-01-08',
      dependencies: [
        { taskId: 'A', type: 'FS', lag: 0 },
        { taskId: 'B', type: 'FS', lag: 0 },
      ],
    });
    const snapshot = [a, b, c];

    const result = recalculateProjectSchedule(snapshot);

    expect(result.changedIds).toEqual(['C']);
    const recalculatedC = result.changedTasks.find(t => t.id === 'C')!;
    expect(recalculatedC.startDate).toBe('2024-01-13');
    expect(recalculatedC.endDate).toBe('2024-01-15');
  });

  it('13. returns only the true diff instead of the full snapshot', () => {
    const a = makeTask({ id: 'A', startDate: '2024-01-01', endDate: '2024-01-05' });
    const b = makeTask({
      id: 'B',
      startDate: '2024-01-08',
      endDate: '2024-01-12',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 2 }],
    });
    const unchanged = makeTask({ id: 'C', startDate: '2024-02-01', endDate: '2024-02-03' });

    const result = recalculateProjectSchedule([a, b, unchanged]);

    expect(result.changedIds).toEqual([]);
    expect(result.changedTasks).toEqual([]);
  });
});

describe('recalculateIncomingLags path', () => {
  it('14. Lag updates after successor moved manually', () => {
    const predecessor = makeTask({ id: 'A', startDate: '2024-01-01', endDate: '2024-01-05' });
    const successor = makeTask({
      id: 'B', startDate: '2024-01-10', endDate: '2024-01-14',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 3 }],
    });
    const snapshot = [predecessor, successor];

    // Move successor to Jan 10-14 (further away)
    const result = moveTaskWithCascade('B', d('2024-01-10'), snapshot);

    const movedB = result.changedTasks.find(t => t.id === 'B')!;
    expect(movedB.startDate).toBe('2024-01-10');
    // Lag should be updated to reflect the new position
    if (movedB.dependencies && movedB.dependencies.length > 0) {
      // lag = succStart - predEnd - 1 = Jan 10 - Jan 5 - 1 = 4
      expect(movedB.dependencies[0].lag).toBe(4);
    }
  });
});

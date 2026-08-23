// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { Task, TaskDependency } from '../types';
import {
  scaleTaskSubtreeDuration,
  type ScaleTaskSubtreeResult,
} from '../subtreeScaling';
import { getTaskDuration } from '../dateMath';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    name: overrides.id,
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    ...overrides,
  };
}

function iso(date: Date): string {
  return date.toISOString().split('T')[0];
}

function d(offsetDays: number, from = '2026-01-01'): string {
  const base = new Date(`${from}T00:00:00.000Z`).getTime();
  return iso(new Date(base + offsetDays * 24 * 60 * 60 * 1000));
}

function byId(result: { changedTasks: Task[] }, id: string): Task {
  const task = result.changedTasks.find((t) => t.id === id);
  expect(task, `task ${id} expected in changedTasks`).toBeDefined();
  return task!;
}

function assertOk(result: ScaleTaskSubtreeResult): asserts result is Extract<ScaleTaskSubtreeResult, { ok: true }> {
  expect(result.ok).toBe(true);
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Scenario 7.1: parent 20 days, leaves 4/6/8 days, two FS lags of 1 day.
 * A[1..4] -1- B[6..11] -1- C[13..20], parent [1..20].
 */
function makeStretchScenario(): Task[] {
  return [
    makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-20' }),
    makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-04', parentId: 'P' }),
    makeTask({
      id: 'B', startDate: '2026-01-06', endDate: '2026-01-11', parentId: 'P',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 1 }],
    }),
    makeTask({
      id: 'C', startDate: '2026-01-13', endDate: '2026-01-20', parentId: 'P',
      dependencies: [{ taskId: 'B', type: 'FS', lag: 1 }],
    }),
  ];
}

/**
 * Scenario 7.2: chain of three 10-day tasks, no lags, parent [1..30].
 */
function makeCompressScenario(): Task[] {
  return [
    makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-30' }),
    makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-10', parentId: 'P' }),
    makeTask({
      id: 'B', startDate: '2026-01-11', endDate: '2026-01-20', parentId: 'P',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
    }),
    makeTask({
      id: 'C', startDate: '2026-01-21', endDate: '2026-01-30', parentId: 'P',
      dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }],
    }),
  ];
}

// ---------------------------------------------------------------------------
// 16.1 Basic semantics
// ---------------------------------------------------------------------------

describe('subtreeScaling: basic semantics', () => {
  it('1. stretches a linked chain 20 -> 30 exactly', () => {
    const snapshot = makeStretchScenario();
    const result = scaleTaskSubtreeDuration('P', 30, snapshot);

    assertOk(result);
    expect(result.appliedDuration).toBe(30);
    expect(result.clamped).toBe(false);
    expect(result.warnings).toEqual([]);

    const a = byId(result, 'A');
    const b = byId(result, 'B');
    const c = byId(result, 'C');
    const p = byId(result, 'P');

    // Anchor start preserved.
    expect(a.startDate).toBe('2026-01-01');
    expect(p.startDate).toBe('2026-01-01');
    expect(p.endDate).toBe('2026-01-30');

    // Explicit lags remain 1 day.
    expect(b.dependencies?.[0]?.lag).toBe(1);
    expect(c.dependencies?.[0]?.lag).toBe(1);

    // Durations distributed proportionally: 18 duration-days over 28 target-days
    // (2 lag days stay fixed) => 6 / 9 / 13, extra day to C by largest remainder.
    expect(getTaskDuration(a.startDate, a.endDate)).toBe(6);
    expect(getTaskDuration(b.startDate, b.endDate)).toBe(9);
    expect(getTaskDuration(c.startDate, c.endDate)).toBe(13);
  });

  it('2. compresses a linked chain 30 -> 20 exactly', () => {
    const snapshot = makeCompressScenario();
    const result = scaleTaskSubtreeDuration('P', 20, snapshot);

    assertOk(result);
    expect(result.appliedDuration).toBe(20);
    expect(byId(result, 'P').endDate).toBe('2026-01-20');
    expect(byId(result, 'A').startDate).toBe('2026-01-01');
  });

  it('3. anchor=start preserves the parent start date', () => {
    const snapshot = makeCompressScenario();
    const result = scaleTaskSubtreeDuration('P', 20, snapshot, { anchor: 'start' });

    assertOk(result);
    expect(byId(result, 'P').startDate).toBe('2026-01-01');
  });

  it('4. anchor=end preserves the parent end date', () => {
    const snapshot = makeCompressScenario();
    const result = scaleTaskSubtreeDuration('P', 20, snapshot, { anchor: 'end' });

    assertOk(result);
    expect(result.appliedDuration).toBe(20);
    expect(byId(result, 'P').endDate).toBe('2026-01-30');
    expect(byId(result, 'P').startDate).toBe('2026-01-11');
  });

  it('5. exact requested duration when the target is reachable', () => {
    const cases: Array<[Task[], number]> = [
      [makeStretchScenario(), 25],
      [makeCompressScenario(), 24],
      [makeCompressScenario(), 12],
    ];
    for (const [snapshot, target] of cases) {
      const result = scaleTaskSubtreeDuration('P', target, snapshot);
      assertOk(result);
      expect(result.appliedDuration, `target ${target}`).toBe(target);
      expect(result.clamped).toBe(false);
    }
  });

  it('6. one common factor preserves relative duration order', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-16' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-04', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-05', endDate: '2026-01-16', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 32, snapshot);

    assertOk(result);
    const a = byId(result, 'A');
    const b = byId(result, 'B');
    expect(getTaskDuration(a.startDate, a.endDate)).toBe(8);
    expect(getTaskDuration(b.startDate, b.endDate)).toBe(24);
  });

  it('7. largest-remainder tie-break is deterministic', () => {
    const build = (): Task[] => [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({ id: 'L1', startDate: '2026-01-01', endDate: '2026-01-05', parentId: 'P' }),
      makeTask({ id: 'L2', startDate: '2026-01-06', endDate: '2026-01-10', parentId: 'P' }),
    ];
    const first = scaleTaskSubtreeDuration('P', 11, build());
    const second = scaleTaskSubtreeDuration('P', 11, build());

    assertOk(first);
    assertOk(second);
    // 5.5 + 5.5 = 11: both tie at .5, earlier start (L1) wins the extra day.
    expect(getTaskDuration(byId(first, 'L1').startDate, byId(first, 'L1').endDate)).toBe(6);
    expect(getTaskDuration(byId(first, 'L2').startDate, byId(first, 'L2').endDate)).toBe(5);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

// ---------------------------------------------------------------------------
// 16.2 Minima and clamping
// ---------------------------------------------------------------------------

describe('subtreeScaling: minima and clamping', () => {
  it('8. ordinary work never shrinks below 1 day by default', () => {
    const snapshot = makeCompressScenario();
    const result = scaleTaskSubtreeDuration('P', 3, snapshot);

    assertOk(result);
    for (const id of ['A', 'B', 'C']) {
      const leaf = byId(result, id);
      expect(getTaskDuration(leaf.startDate, leaf.endDate)).toBeGreaterThanOrEqual(1);
    }
  });

  it('9. individual getMinDuration is respected', () => {
    const snapshot = makeCompressScenario();
    const result = scaleTaskSubtreeDuration('P', 22, snapshot, {
      getMinDuration: (task) => (task.id === 'A' ? 7 : 1),
    });

    assertOk(result);
    expect(getTaskDuration(byId(result, 'A').startDate, byId(result, 'A').endDate)).toBeGreaterThanOrEqual(7);
    expect(result.appliedDuration).toBe(22);
  });

  it('10. positive lags shrink after durations are exhausted', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-03', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 4 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 4, snapshot);

    assertOk(result);
    expect(result.appliedDuration).toBe(4);
    expect(byId(result, 'A').endDate).toBe('2026-01-01');
    // Durations hit minimum (1) before lags were touched.
    expect(byId(result, 'B').dependencies?.[0]?.lag).toBeLessThan(4);
    expect(getTaskDuration(byId(result, 'B').startDate, byId(result, 'B').endDate)).toBe(1);
  });

  it('11. getMinLag is respected', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-03', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 4 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 4, snapshot, {
      getMinLag: () => 3,
    });

    assertOk(result);
    // Lag floor 3 keeps the span at 5: clamped to the proven minimum.
    expect(result.clamped).toBe(true);
    expect(result.appliedDuration).toBe(5);
    expect(byId(result, 'B').dependencies?.[0]?.lag).toBe(3);
    expect(result.warnings).toEqual([
      { code: 'TARGET_CLAMPED_TO_MINIMUM', requestedDuration: 4, minimumDuration: 5 },
    ]);
  });

  it('12. negative lag is never changed', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-06', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-05', endDate: '2026-01-10', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: -2 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 6, snapshot);

    assertOk(result);
    expect(result.appliedDuration).toBe(6);
    expect(byId(result, 'B').dependencies?.[0]?.lag).toBe(-2);
  });

  it('13. request below the minimum returns the minimal schedule plus warning', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-14' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-06', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-09', endDate: '2026-01-14', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 2 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 7, snapshot, {
      getMinDuration: () => 4,
    });

    assertOk(result);
    expect(result.ok && result.requestedDuration).toBe(7);
    // Minimum: A=4 [1..4], lag 0, B=4 [5..8] => 8 days.
    expect(result.appliedDuration).toBe(8);
    expect(result.clamped).toBe(true);
    expect(result.warnings).toEqual([
      { code: 'TARGET_CLAMPED_TO_MINIMUM', requestedDuration: 7, minimumDuration: 8 },
    ]);
    expect(getTaskDuration(byId(result, 'A').startDate, byId(result, 'A').endDate)).toBe(4);
  });

  it('14. appliedDuration equals the proven minimum', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-05', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-06', endDate: '2026-01-10', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 1, snapshot);

    assertOk(result);
    // Two leaves with min duration 1 each => minimum span 2.
    expect(result.appliedDuration).toBe(2);
    expect(result.clamped).toBe(true);
    expect(result.warnings[0]?.code).toBe('TARGET_CLAMPED_TO_MINIMUM');
  });
});

// ---------------------------------------------------------------------------
// 16.3 Hierarchy
// ---------------------------------------------------------------------------

describe('subtreeScaling: hierarchy', () => {
  it('15. nested parents are recomputed bottom-up', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-30' }),
      makeTask({ id: 'Q', startDate: '2026-01-01', endDate: '2026-01-20', parentId: 'P' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-10', parentId: 'Q' }),
      makeTask({
        id: 'B', startDate: '2026-01-11', endDate: '2026-01-20', parentId: 'Q',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
      makeTask({ id: 'D', startDate: '2026-01-21', endDate: '2026-01-30', parentId: 'P' }),
    ];
    const result = scaleTaskSubtreeDuration('P', 15, snapshot);

    assertOk(result);
    const q = byId(result, 'Q');
    const a = byId(result, 'A');
    const b = byId(result, 'B');
    // Q range equals the range of its own children.
    expect(q.startDate).toBe(a.startDate);
    expect(q.endDate).toBe(b.endDate);
    expect(result.appliedDuration).toBe(15);
  });

  it('16. selected parent matches the range of its children', () => {
    const snapshot = makeCompressScenario();
    const result = scaleTaskSubtreeDuration('P', 20, snapshot);

    assertOk(result);
    const p = byId(result, 'P');
    const a = byId(result, 'A');
    const c = byId(result, 'C');
    expect(p.startDate).toBe(a.startDate);
    expect(p.endDate).toBe(c.endDate);
  });

  it('17. a sibling subtree outside the selection is untouched', () => {
    const snapshot: Task[] = [
      ...makeCompressScenario(),
      makeTask({ id: 'R', startDate: '2026-02-01', endDate: '2026-02-10' }),
      makeTask({ id: 'RX', startDate: '2026-02-01', endDate: '2026-02-10', parentId: 'R' }),
    ];
    const result = scaleTaskSubtreeDuration('P', 20, snapshot);

    assertOk(result);
    expect(result.changedIds).not.toContain('R');
    expect(result.changedIds).not.toContain('RX');
  });

  it('18. a leaf returns NOT_A_PARENT', () => {
    const snapshot = makeCompressScenario();
    const result = scaleTaskSubtreeDuration('A', 5, snapshot);
    expect(result).toMatchObject({ ok: false, code: 'NOT_A_PARENT', changedTasks: [], changedIds: [] });
  });

  it('19. a missing parent returns TASK_NOT_FOUND', () => {
    const snapshot = makeCompressScenario();
    const result = scaleTaskSubtreeDuration('NOPE', 5, snapshot);
    expect(result).toMatchObject({ ok: false, code: 'TASK_NOT_FOUND', changedTasks: [], changedIds: [] });
  });

  it('20. a hierarchy cycle is a hard error without changes', () => {
    const snapshot: Task[] = [
      ...makeCompressScenario(),
      makeTask({ id: 'X1', startDate: '2026-01-01', endDate: '2026-01-02', parentId: 'X2' }),
      makeTask({ id: 'X2', startDate: '2026-01-01', endDate: '2026-01-02', parentId: 'X1' }),
    ];
    const result = scaleTaskSubtreeDuration('P', 20, snapshot);
    expect(result).toMatchObject({ ok: false, code: 'INVALID_HIERARCHY', changedTasks: [], changedIds: [] });
  });

  it('20b. invalid target durations are rejected', () => {
    const snapshot = makeCompressScenario();
    for (const bad of [0, -3, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = scaleTaskSubtreeDuration('P', bad, snapshot);
      expect(result, `target ${bad}`).toMatchObject({ ok: false, code: 'INVALID_TARGET_DURATION' });
    }
  });

  it('20d. invalid callback minima are rejected with INVALID_MINIMUM', () => {
    const snapshot = makeCompressScenario();
    const badDuration = scaleTaskSubtreeDuration('P', 20, snapshot, {
      getMinDuration: () => Number.NaN,
    });
    expect(badDuration).toMatchObject({ ok: false, code: 'INVALID_MINIMUM', changedTasks: [], changedIds: [] });

    const lagSnapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-03', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 4 }],
      }),
    ];
    // A minimum above the original positive lag is invalid (10.5).
    const badLag = scaleTaskSubtreeDuration('P', 4, lagSnapshot, { getMinLag: () => 5 });
    expect(badLag).toMatchObject({ ok: false, code: 'INVALID_MINIMUM', changedTasks: [], changedIds: [] });
  });

  it('20e. a milestone-only subtree scales positions without crashing', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-05' }),
      makeTask({ id: 'M1', startDate: '2026-01-01', endDate: '2026-01-01', parentId: 'P', type: 'milestone' }),
      makeTask({ id: 'M2', startDate: '2026-01-05', endDate: '2026-01-05', parentId: 'P', type: 'milestone' }),
    ];
    const result = scaleTaskSubtreeDuration('P', 10, snapshot);

    assertOk(result);
    // Milestones have no durations: growth extends the farthest virtual offset.
    expect(result.appliedDuration).toBe(10);
    const m2 = byId(result, 'M2');
    expect(m2.startDate).toBe(m2.endDate);
    expect(m2.startDate).toBe('2026-01-10');
    expect(byId(result, 'P').endDate).toBe('2026-01-10');
  });

  it('20c. self-parent and missing parent references are hard errors', () => {
    const selfParent: Task[] = [
      ...makeCompressScenario(),
      makeTask({ id: 'S', startDate: '2026-01-01', endDate: '2026-01-02', parentId: 'S' }),
    ];
    expect(scaleTaskSubtreeDuration('P', 20, selfParent)).toMatchObject({ ok: false, code: 'INVALID_HIERARCHY' });

    const missingParent: Task[] = [
      ...makeCompressScenario(),
      makeTask({ id: 'M', startDate: '2026-01-01', endDate: '2026-01-02', parentId: 'GHOST' }),
    ];
    expect(scaleTaskSubtreeDuration('P', 20, missingParent)).toMatchObject({ ok: false, code: 'INVALID_HIERARCHY' });
  });
});

// ---------------------------------------------------------------------------
// 16.4 Milestones and immutable tasks
// ---------------------------------------------------------------------------

describe('subtreeScaling: milestones and immutable tasks', () => {
  function makeMilestoneScenario(): Task[] {
    return [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-09' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-04', parentId: 'P' }),
      makeTask({
        id: 'M', startDate: '2026-01-05', endDate: '2026-01-05', parentId: 'P', type: 'milestone',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
      makeTask({
        id: 'B', startDate: '2026-01-06', endDate: '2026-01-09', parentId: 'P',
        dependencies: [{ taskId: 'M', type: 'FS', lag: 0 }],
      }),
    ];
  }

  it('21. a milestone moves and stays zero-duration', () => {
    const snapshot = makeMilestoneScenario();
    const result = scaleTaskSubtreeDuration('P', 18, snapshot);

    assertOk(result);
    expect(result.appliedDuration).toBe(18);
    const m = byId(result, 'M');
    expect(m.startDate).toBe(m.endDate);
    expect(m.startDate).not.toBe('2026-01-05');
    expect(getTaskDuration(m.startDate, m.endDate)).toBe(1);
  });

  it('22. a locked leaf keeps dates and dependencies bitwise', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-15' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-05', parentId: 'P' }),
      makeTask({
        id: 'L', startDate: '2026-01-06', endDate: '2026-01-10', parentId: 'P', locked: true,
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
      makeTask({
        id: 'B', startDate: '2026-01-11', endDate: '2026-01-15', parentId: 'P',
        dependencies: [{ taskId: 'L', type: 'FS', lag: 0 }],
      }),
    ];
    const lockedBefore = JSON.stringify(snapshot.find((t) => t.id === 'L'));
    const result = scaleTaskSubtreeDuration('P', 10, snapshot);

    assertOk(result);
    expect(result.changedIds).not.toContain('L');
    expect(lockedBefore).toBe(JSON.stringify(snapshot.find((t) => t.id === 'L')));
  });

  it('23. other tasks adapt around a locked leaf', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-15' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-05', parentId: 'P' }),
      makeTask({
        id: 'L', startDate: '2026-01-06', endDate: '2026-01-10', parentId: 'P', locked: true,
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
      makeTask({
        id: 'B', startDate: '2026-01-11', endDate: '2026-01-15', parentId: 'P',
        dependencies: [{ taskId: 'L', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 30, snapshot);

    assertOk(result);
    expect(result.appliedDuration).toBe(30);
    const l = snapshot.find((t) => t.id === 'L')!;
    const b = byId(result, 'B');
    // B starts right after the locked task ends: adapted around it.
    expect(b.startDate).toBe('2026-01-11');
    expect(l.startDate).toBe('2026-01-06');
    expect(l.endDate).toBe('2026-01-10');
  });

  it('24. a locked constraint raising the minimum causes a clamp', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-25' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-10', parentId: 'P' }),
      makeTask({
        id: 'L', startDate: '2026-01-11', endDate: '2026-01-15', parentId: 'P', locked: true,
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
      makeTask({
        id: 'B', startDate: '2026-01-16', endDate: '2026-01-25', parentId: 'P',
        dependencies: [{ taskId: 'L', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 15, snapshot);

    assertOk(result);
    // L is pinned at [11..15]; A root at day 1 with min 1 day; B must follow L.
    // Minimum span = [1 .. 16] = 16 days > requested 15.
    expect(result.clamped).toBe(true);
    expect(result.appliedDuration).toBe(16);
    expect(result.warnings[0]).toMatchObject({
      code: 'TARGET_CLAMPED_TO_MINIMUM',
      requestedDuration: 15,
      minimumDuration: 16,
    });
  });

  it('25. isImmutable override allows changing a locked task', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-05', parentId: 'P', locked: true }),
      makeTask({
        id: 'B', startDate: '2026-01-06', endDate: '2026-01-10', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 20, snapshot, { isImmutable: () => false });

    assertOk(result);
    expect(result.changedIds).toContain('A');
    expect(result.appliedDuration).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// 16.5 Dependencies
// ---------------------------------------------------------------------------

describe('subtreeScaling: dependency links', () => {
  const targets: Array<{ type: TaskDependency['type']; target: number }> = [
    { type: 'FS', target: 16 },
    { type: 'SS', target: 16 },
    { type: 'FF', target: 16 },
    { type: 'SF', target: 16 },
  ];

  for (const { type, target } of targets) {
    it(`26-29. ${type} link is preserved and valid`, () => {
      const snapshot: Task[] = [
        makeTask({ id: 'P', startDate: '2025-12-28', endDate: '2026-01-08' }),
        makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-04', parentId: 'P' }),
        makeTask({
          id: 'B', startDate: '2026-01-05', endDate: '2026-01-08', parentId: 'P',
          dependencies: [{ taskId: 'A', type, lag: 0 }],
        }),
      ];
      const result = scaleTaskSubtreeDuration('P', target, snapshot);

      assertOk(result);
      expect(result.appliedDuration).toBe(target);
      const b = byId(result, 'B');
      expect(b.dependencies?.[0]?.type).toBe(type);
      expect(b.dependencies?.[0]?.taskId).toBe('A');
    });
  }

  it('30. multiple predecessors use the strongest constraint', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-04', parentId: 'P' }),
      makeTask({ id: 'B', startDate: '2026-01-01', endDate: '2026-01-06', parentId: 'P' }),
      makeTask({
        id: 'C', startDate: '2026-01-07', endDate: '2026-01-10', parentId: 'P',
        dependencies: [
          { taskId: 'A', type: 'FS', lag: 0 },
          { taskId: 'B', type: 'FS', lag: 0 },
        ],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 20, snapshot);

    assertOk(result);
    // B (stretched to 12 days, ends on the 12th) binds C later than A.
    const c = byId(result, 'C');
    expect(c.startDate).toBe('2026-01-13');
    expect(result.appliedDuration).toBe(20);
  });

  it('31. parent-level dependency lag is untouched', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'EXT', startDate: '2025-12-25', endDate: '2025-12-31' }),
      makeTask({
        id: 'P', startDate: '2026-01-01', endDate: '2026-01-30',
        dependencies: [{ taskId: 'EXT', type: 'FS', lag: 2 }],
      }),
      ...makeCompressScenario().filter((t) => t.id !== 'P').map((t) => ({ ...t, parentId: t.parentId })),
    ];
    const result = scaleTaskSubtreeDuration('P', 20, snapshot);

    assertOk(result);
    const p = byId(result, 'P');
    expect(p.dependencies).toEqual([{ taskId: 'EXT', type: 'FS', lag: 2 }]);
  });

  it('32. a dependency cycle is a hard error with empty changes', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({
        id: 'A', startDate: '2026-01-01', endDate: '2026-01-05', parentId: 'P',
        dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }],
      }),
      makeTask({
        id: 'B', startDate: '2026-01-06', endDate: '2026-01-10', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 5, snapshot);
    expect(result).toMatchObject({ ok: false, code: 'INVALID_DEPENDENCIES', changedTasks: [], changedIds: [] });
  });

  it('33. a missing dependency endpoint is a hard error', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-10', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-01', endDate: '2026-01-10',
        dependencies: [{ taskId: 'GHOST', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 5, snapshot);
    expect(result).toMatchObject({ ok: false, code: 'INVALID_DEPENDENCIES', changedTasks: [], changedIds: [] });
  });
});

// ---------------------------------------------------------------------------
// 16.6 Independent branches
// ---------------------------------------------------------------------------

describe('subtreeScaling: independent branches', () => {
  function makeParallelScenario(): Task[] {
    return [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-15' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-05', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-06', endDate: '2026-01-10', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
      makeTask({ id: 'X', startDate: '2026-01-04', endDate: '2026-01-08', parentId: 'P' }),
    ];
  }

  it('34. virtual offset shrinks on compression', () => {
    const snapshot = makeParallelScenario();
    const result = scaleTaskSubtreeDuration('P', 5, snapshot);

    assertOk(result);
    const x = byId(result, 'X');
    const a = byId(result, 'A');
    // X originally started 3 days after A; compressed layout pulls it closer.
    const xOffset =
      (new Date(x.startDate).getTime() - new Date(a.startDate).getTime()) / (24 * 60 * 60 * 1000);
    expect(xOffset).toBeLessThan(3);
    expect(result.appliedDuration).toBe(5);
  });

  it('35. virtual offset grows on stretching', () => {
    const snapshot = makeParallelScenario();
    const result = scaleTaskSubtreeDuration('P', 30, snapshot);

    assertOk(result);
    const x = byId(result, 'X');
    const a = byId(result, 'A');
    const xOffset =
      (new Date(x.startDate).getTime() - new Date(a.startDate).getTime()) / (24 * 60 * 60 * 1000);
    expect(xOffset).toBeGreaterThan(3);
    expect(result.appliedDuration).toBe(30);
  });

  it('36. parallel branches keep their relative placement close', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-15' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-10', parentId: 'P' }),
      makeTask({ id: 'X', startDate: '2026-01-06', endDate: '2026-01-15', parentId: 'P' }),
    ];
    const result = scaleTaskSubtreeDuration('P', 30, snapshot);

    assertOk(result);
    const a = byId(result, 'A');
    const x = byId(result, 'X');
    // Both branches double: X keeps starting halfway through A.
    expect(a.startDate).toBe('2026-01-01');
    expect(x.startDate).toBe('2026-01-11');
    expect(x.endDate).toBe('2026-01-30');
  });

  it('37. several fully independent tasks reach the exact total range', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({ id: 'X1', startDate: '2026-01-01', endDate: '2026-01-02', parentId: 'P' }),
      makeTask({ id: 'X2', startDate: '2026-01-05', endDate: '2026-01-06', parentId: 'P' }),
      makeTask({ id: 'X3', startDate: '2026-01-09', endDate: '2026-01-10', parentId: 'P' }),
    ];
    const result = scaleTaskSubtreeDuration('P', 20, snapshot);

    assertOk(result);
    expect(result.appliedDuration).toBe(20);
    expect(byId(result, 'X1').startDate).toBe('2026-01-01');
    expect(byId(result, 'X3').endDate).toBe('2026-01-20');
  });
});

// ---------------------------------------------------------------------------
// 16.7 External dependencies
// ---------------------------------------------------------------------------

describe('subtreeScaling: external dependencies', () => {
  function makeExternalScenario(): Task[] {
    return [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-05' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-05', parentId: 'P' }),
      makeTask({
        id: 'EXT2', startDate: '2026-01-06', endDate: '2026-01-10',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
    ];
  }

  it('38. an incoming external predecessor is never changed', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'EXT', startDate: '2026-01-01', endDate: '2026-01-05' }),
      makeTask({ id: 'P', startDate: '2026-01-06', endDate: '2026-01-13' }),
      makeTask({
        id: 'A', startDate: '2026-01-06', endDate: '2026-01-09', parentId: 'P',
        dependencies: [{ taskId: 'EXT', type: 'FS', lag: 0 }],
      }),
      makeTask({
        id: 'B', startDate: '2026-01-10', endDate: '2026-01-13', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 16, snapshot);

    assertOk(result);
    expect(result.changedIds).not.toContain('EXT');
    expect(result.appliedDuration).toBe(16);
    expect(byId(result, 'A').startDate).toBe('2026-01-06');
  });

  it('39. subtree-only outgoing violation returns a conflict without changes', () => {
    const snapshot = makeExternalScenario();
    const result = scaleTaskSubtreeDuration('P', 10, snapshot);

    expect(result).toMatchObject({ ok: false, code: 'EXTERNAL_DEPENDENCY_CONFLICT' });
    if (!result.ok) {
      expect(result.changedTasks).toEqual([]);
      expect(result.changedIds).toEqual([]);
      expect(result.details?.length).toBeGreaterThan(0);
    }
  });

  it('40. cascade-successors shifts the external chain', () => {
    const snapshot: Task[] = [
      ...makeExternalScenario(),
      makeTask({
        id: 'EXT3', startDate: '2026-01-11', endDate: '2026-01-15',
        dependencies: [{ taskId: 'EXT2', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 10, snapshot, {
      externalDependencyPolicy: 'cascade-successors',
    });

    assertOk(result);
    expect(result.appliedDuration).toBe(10);
    const ext2 = byId(result, 'EXT2');
    const ext3 = byId(result, 'EXT3');
    expect(ext2.startDate).toBe('2026-01-11');
    expect(ext3.startDate).toBe('2026-01-16');
  });

  it('41. external durations are preserved by the cascade', () => {
    const snapshot = makeExternalScenario();
    const result = scaleTaskSubtreeDuration('P', 10, snapshot, {
      externalDependencyPolicy: 'cascade-successors',
    });

    assertOk(result);
    const ext2 = byId(result, 'EXT2');
    expect(getTaskDuration(ext2.startDate, ext2.endDate)).toBe(5);
  });

  it('42. an immutable external successor cancels the atomic operation', () => {
    const snapshot: Task[] = [
      ...makeExternalScenario(),
    ];
    (snapshot.find((t) => t.id === 'EXT2') as Task).locked = true;
    const result = scaleTaskSubtreeDuration('P', 10, snapshot, {
      externalDependencyPolicy: 'cascade-successors',
    });

    expect(result).toMatchObject({ ok: false, code: 'EXTERNAL_DEPENDENCY_CONFLICT', changedTasks: [], changedIds: [] });
  });
});

// ---------------------------------------------------------------------------
// 16.8 Calendar modes
// ---------------------------------------------------------------------------

describe('subtreeScaling: calendar modes', () => {
  it('43. calendar-day durations match getTaskDuration', () => {
    const snapshot = makeStretchScenario();
    const result = scaleTaskSubtreeDuration('P', 30, snapshot);

    assertOk(result);
    for (const id of ['A', 'B', 'C']) {
      const leaf = byId(result, id);
      expect(getTaskDuration(leaf.startDate, leaf.endDate, false)).toBe(
        Math.round(
          (new Date(leaf.endDate).getTime() - new Date(leaf.startDate).getTime()) / (24 * 60 * 60 * 1000)
        ) + 1
      );
    }
  });

  it('44. business-day durations match getTaskDuration', () => {
    // 2026-01-05 is a Monday.
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-16' }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-09', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-12', endDate: '2026-01-16', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 6, snapshot, {
      businessDays: true,
      weekendPredicate: isWeekend,
    });

    assertOk(result);
    expect(result.appliedDuration).toBe(6);
    const a = byId(result, 'A');
    const b = byId(result, 'B');
    expect(getTaskDuration(a.startDate, a.endDate, true, isWeekend)).toBe(3);
    expect(getTaskDuration(b.startDate, b.endDate, true, isWeekend)).toBe(3);
    // B starts on the next business day after A ends.
    expect(a.endDate).toBe('2026-01-07');
    expect(b.startDate).toBe('2026-01-08');
  });

  it('45. weekends are skipped via weekendPredicate', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-16' }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-09', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-12', endDate: '2026-01-16', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 8, snapshot, {
      businessDays: true,
      weekendPredicate: isWeekend,
    });

    assertOk(result);
    const a = byId(result, 'A');
    const b = byId(result, 'B');
    // A compresses to 4 business days ending Thursday; B starts Friday and its
    // 4 business days skip the weekend: Fri 09 + Mon 12..Wed 14.
    expect(a.endDate).toBe('2026-01-08');
    expect(b.startDate).toBe('2026-01-09');
    expect(b.endDate).toBe('2026-01-14');
    expect(new Date(`${b.endDate}T00:00:00.000Z`).getUTCDay()).not.toBe(0);
    expect(new Date(`${b.endDate}T00:00:00.000Z`).getUTCDay()).not.toBe(6);
  });

  it('46. custom working Saturdays are honoured', () => {
    const sundayOnly = (date: Date) => date.getUTCDay() === 0;
    // With Saturdays working: A spans Mon 05 - Sat 10 (6 working days).
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-17' }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-10', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-12', endDate: '2026-01-17', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 8, snapshot, {
      businessDays: true,
      weekendPredicate: sundayOnly,
    });

    assertOk(result);
    expect(result.appliedDuration).toBe(8);
    const a = byId(result, 'A');
    const b = byId(result, 'B');
    expect(getTaskDuration(a.startDate, a.endDate, true, sundayOnly)).toBe(4);
    expect(getTaskDuration(b.startDate, b.endDate, true, sundayOnly)).toBe(4);
  });

  it('47. the result contains no timezone drift', () => {
    const snapshot = makeCompressScenario();
    const result = scaleTaskSubtreeDuration('P', 20, snapshot);

    assertOk(result);
    for (const task of result.changedTasks) {
      for (const value of [task.startDate, task.endDate]) {
        const date = new Date(`${value}T00:00:00.000Z`);
        expect(date.toISOString()).toBe(`${value}T00:00:00.000Z`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 16.9 Atomicity and data preservation
// ---------------------------------------------------------------------------

describe('subtreeScaling: atomicity and data preservation', () => {
  function deepFreeze<T>(value: T): T {
    if (value && typeof value === 'object') {
      Object.freeze(value);
      for (const key of Object.keys(value as Record<string, unknown>)) {
        deepFreeze((value as Record<string, unknown>)[key]);
      }
    }
    return value;
  }

  it('48. a deep-frozen input causes no mutation error', () => {
    const snapshot = deepFreeze(makeStretchScenario().map((t) => ({ ...t })));
    const result = scaleTaskSubtreeDuration('P', 30, snapshot);
    assertOk(result);
    expect(result.appliedDuration).toBe(30);
  });

  it('49. dependency arrays of the input snapshot stay untouched', () => {
    const snapshot = makeStretchScenario();
    const before = JSON.stringify(snapshot);
    scaleTaskSubtreeDuration('P', 30, snapshot);
    expect(JSON.stringify(snapshot)).toBe(before);
  });

  it('50-52. baseline, progress and consumer fields survive', () => {
    const snapshot: Task[] = [
      makeTask({
        id: 'P', startDate: '2026-01-01', endDate: '2026-01-30',
        baselineStartDate: '2026-01-01', baselineEndDate: '2026-01-30', progress: 40,
      }),
      makeTask({
        id: 'A', startDate: '2026-01-01', endDate: '2026-01-10', parentId: 'P',
        baselineStartDate: '2026-01-01', baselineEndDate: '2026-01-10', progress: 50,
        color: '#ff0000', accepted: true, synced: false,
      }),
      makeTask({
        id: 'B', startDate: '2026-01-11', endDate: '2026-01-30', parentId: 'P',
        baselineStartDate: '2026-01-11', baselineEndDate: '2026-01-30', progress: 30,
        color: '#00ff00', planByDate: { '2026-01-11': 5 },
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
    ];
    const originals = new Map(snapshot.map((t) => [t.id, t]));
    const result = scaleTaskSubtreeDuration('P', 15, snapshot);

    assertOk(result);
    for (const changed of result.changedTasks) {
      const original = originals.get(changed.id)!;
      expect(changed.baselineStartDate).toBe(original.baselineStartDate);
      expect(changed.baselineEndDate).toBe(original.baselineEndDate);
      expect(changed.progress).toBe(original.progress);
      expect(changed.color).toBe(original.color);
      expect(changed.planByDate).toEqual(original.planByDate);
      expect(changed.accepted).toBe(original.accepted);
    }
  });

  it('53. changedTasks is sparse and duplicate-free', () => {
    const snapshot = makeStretchScenario();
    const result = scaleTaskSubtreeDuration('P', 30, snapshot);

    assertOk(result);
    expect(result.changedIds).toEqual(result.changedTasks.map((t) => t.id));
    expect(new Set(result.changedIds).size).toBe(result.changedIds.length);
    // No-op scaling returns an empty batch.
    const noop = scaleTaskSubtreeDuration('P', 20, makeStretchScenario());
    assertOk(noop);
    expect(noop.changedTasks).toEqual([]);
  });

  it('53b. changedTasks follow the canonical order (leaves, parents deep-to-shallow, external)', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-30' }),
      makeTask({ id: 'Q', startDate: '2026-01-01', endDate: '2026-01-20', parentId: 'P' }),
      makeTask({ id: 'B', startDate: '2026-01-11', endDate: '2026-01-20', parentId: 'Q' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-10', parentId: 'Q' }),
      // A depends on B in snapshot order B before A: leaves must come out in snapshot order.
      makeTask({
        id: 'D', startDate: '2026-01-21', endDate: '2026-01-30', parentId: 'P',
        dependencies: [{ taskId: 'Q', type: 'FS', lag: 0 }],
      }),
    ];
    const result = scaleTaskSubtreeDuration('P', 15, snapshot);

    assertOk(result);
    // Leaves in snapshot order, then nested parents, then the selected parent.
    expect(result.changedIds).toEqual(['B', 'A', 'D', 'Q', 'P']);
  });

  it('54. two identical runs return identical JSON', () => {
    const first = scaleTaskSubtreeDuration('P', 30, makeStretchScenario());
    const second = scaleTaskSubtreeDuration('P', 30, makeStretchScenario());
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

// ---------------------------------------------------------------------------
// 16.10 Load minimum
// ---------------------------------------------------------------------------

describe('subtreeScaling: load minimum', () => {
  it('55. a 100-leaf subtree completes without stack overflow', () => {
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: d(199) }),
    ];
    for (let i = 0; i < 100; i++) {
      snapshot.push(
        makeTask({
          id: `L${i}`,
          startDate: d(i * 2),
          endDate: d(i * 2 + 1),
          parentId: 'P',
          ...(i > 0 ? { dependencies: [{ taskId: `L${i - 1}`, type: 'FS' as const, lag: 0 }] } : {}),
        })
      );
    }
    const result = scaleTaskSubtreeDuration('P', 100, snapshot);

    assertOk(result);
    expect(result.appliedDuration).toBe(100);
    expect(byId(result, 'P').endDate).toBe(d(99));
  });

  it('56. deep hierarchy uses guarded traversal', () => {
    const snapshot: Task[] = [makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-02' })];
    let parentId = 'P';
    for (let level = 0; level < 30; level++) {
      const id = `N${level}`;
      snapshot.push(makeTask({ id, startDate: '2026-01-01', endDate: '2026-01-02', parentId }));
      parentId = id;
    }
    snapshot.push(makeTask({ id: 'LEAF', startDate: '2026-01-01', endDate: '2026-01-02', parentId }));

    const result = scaleTaskSubtreeDuration('P', 10, snapshot);
    assertOk(result);
    expect(result.appliedDuration).toBe(10);
  });

  it('57. iteration bound is derived from adjustable slack, not wall-clock', () => {
    // Heavy compression with lots of slack: must terminate quickly and deterministically.
    const snapshot: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: d(59) }),
    ];
    for (let i = 0; i < 10; i++) {
      snapshot.push(
        makeTask({
          id: `L${i}`,
          startDate: d(i * 6),
          endDate: d(i * 6 + 5),
          parentId: 'P',
          ...(i > 0 ? { dependencies: [{ taskId: `L${i - 1}`, type: 'FS' as const, lag: 0 }] } : {}),
        })
      );
    }
    const started = Date.now();
    const result = scaleTaskSubtreeDuration('P', 10, snapshot);
    const elapsed = Date.now() - started;

    assertOk(result);
    expect(result.appliedDuration).toBe(10);
    expect(elapsed).toBeLessThan(10_000);
  });
});

// ---------------------------------------------------------------------------
// 17. Property-style invariant checks
// ---------------------------------------------------------------------------

describe('subtreeScaling: property-style invariants', () => {
  const scenarios: Array<{ name: string; run: () => ScaleTaskSubtreeResult }> = [
    { name: 'stretch 20->30', run: () => scaleTaskSubtreeDuration('P', 30, makeStretchScenario()) },
    { name: 'compress 30->20', run: () => scaleTaskSubtreeDuration('P', 20, makeCompressScenario()) },
    {
      name: 'clamped 10->4',
      run: () =>
        scaleTaskSubtreeDuration('P', 4, [
          makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
          makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-05', parentId: 'P' }),
          makeTask({
            id: 'B', startDate: '2026-01-06', endDate: '2026-01-10', parentId: 'P',
            dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
          }),
        ], { getMinDuration: () => 4 }),
    },
    { name: 'independent branches 10->20', run: () => scaleTaskSubtreeDuration('P', 20, [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({ id: 'X1', startDate: '2026-01-01', endDate: '2026-01-05', parentId: 'P' }),
      makeTask({ id: 'X2', startDate: '2026-01-06', endDate: '2026-01-10', parentId: 'P' }),
    ]) },
  ];

  for (const scenario of scenarios) {
    it(`holds invariants for: ${scenario.name}`, () => {
      const result = scenario.run();
      assertOk(result);

      const p = result.changedTasks.find((t) => t.id === 'P');
      if (p) {
        const span = getTaskDuration(p.startDate, p.endDate);
        expect(span).toBe(result.appliedDuration);
        expect(result.appliedDuration).toBeGreaterThanOrEqual(1);
        if (!result.clamped) {
          expect(result.appliedDuration).toBe(result.requestedDuration);
        } else {
          expect(result.appliedDuration).toBeGreaterThan(result.requestedDuration);
        }
      }

      for (const task of result.changedTasks) {
        expect(task.startDate <= task.endDate).toBe(true);
      }

      // Input immutability + determinism.
      const again = scenario.run();
      expect(JSON.stringify(again)).toBe(JSON.stringify(result));
    });
  }
});

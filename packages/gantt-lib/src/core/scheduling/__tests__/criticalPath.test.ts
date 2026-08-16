import { describe, it, expect } from 'vitest';
import { computeCriticalPath, extendCriticalIdsToParents } from '../criticalPath';
import type { ScheduleTask } from '../types';

const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

function makeTask(partial: { id: string; startDate: string; endDate: string; dependencies?: ScheduleTask['dependencies']; parentId?: string }): ScheduleTask {
  return { ...partial };
}

describe('computeCriticalPath', () => {
  it('marks all tasks of a single linear FS chain as critical', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }] }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'B', 'C']));
  });

  it('marks only the longest parallel branch as critical', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B1', startDate: '2026-01-08', endDate: '2026-01-09', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'B2', startDate: '2026-01-08', endDate: '2026-01-12', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-13', endDate: '2026-01-15', dependencies: [{ taskId: 'B1', type: 'FS', lag: 0 }, { taskId: 'B2', type: 'FS', lag: 0 }] }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'B2', 'C']));
  });

  it('marks all equally-long parallel branches as critical', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B1', startDate: '2026-01-08', endDate: '2026-01-09', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'B2', startDate: '2026-01-08', endDate: '2026-01-09', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-10', endDate: '2026-01-12', dependencies: [{ taskId: 'B1', type: 'FS', lag: 0 }, { taskId: 'B2', type: 'FS', lag: 0 }] }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'B1', 'B2', 'C']));
  });

  it('accounts for a positive FS lag lengthening the path', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 2 }] }),
      makeTask({ id: 'B2', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }, { taskId: 'B2', type: 'FS', lag: 0 }] }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'B', 'C']));
  });

  it('uses SS/FF/SF links when building the graph', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'SS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FF', lag: 0 }] }),
      makeTask({ id: 'D', startDate: '2026-01-14', endDate: '2026-01-16', dependencies: [{ taskId: 'C', type: 'SF', lag: 0 }] }),
    ];
    // A non-empty result proves non-FS links create edges — isolated tasks are never critical.
    expect(computeCriticalPath(tasks).size).toBeGreaterThan(0);
  });

  it('accounts for a negative FS lag shortening the path', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      // B (lag 0) and B2 (lag -2) are otherwise identical; the negative lag
      // shortens B2's branch below B's, so only B stays on the critical path.
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-09', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'B2', startDate: '2026-01-08', endDate: '2026-01-09', dependencies: [{ taskId: 'A', type: 'FS', lag: -2 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }, { taskId: 'B2', type: 'FS', lag: 0 }] }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'B', 'C']));
  });

  it('treats a milestone (single-day leaf) as a regular leaf in the path', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'M', startDate: '2026-01-08', endDate: '2026-01-08', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'M']));
  });

  it('does not mark isolated tasks (no FS edges) as critical', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10' }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set());
  });

  it('does not hang on a cycle and returns no critical tasks from it', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
    ];
    expect(() => computeCriticalPath(tasks)).not.toThrow();
    expect(computeCriticalPath(tasks)).toEqual(new Set());
  });

  it('excludes parent tasks (tasks that have children) from the graph', () => {
    const tasks = [
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-12' }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07', parentId: 'P' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', parentId: 'P', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
    ];
    const result = computeCriticalPath(tasks);
    expect(result.has('P')).toBe(false);
    expect(result).toEqual(new Set(['A', 'B']));
  });

  it('expands a dependency on a parent group to its leaf descendants', () => {
    const tasks = [
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-15' }),
      makeTask({ id: 'A1', startDate: '2026-01-05', endDate: '2026-01-07', parentId: 'P' }),
      makeTask({ id: 'A2', startDate: '2026-01-08', endDate: '2026-01-12', parentId: 'P' }),
      makeTask({ id: 'B', startDate: '2026-01-13', endDate: '2026-01-15', dependencies: [{ taskId: 'P', type: 'FS', lag: 0 }] }),
    ];
    // Only the last-finishing leaf of the group constrains the successor.
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A2', 'B']));
  });

  it('expands a dependency on an ancestor group across nested levels', () => {
    const tasks = [
      makeTask({ id: 'G', startDate: '2026-01-05', endDate: '2026-01-20' }),
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-15', parentId: 'G' }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-12', parentId: 'P' }),
      makeTask({ id: 'B', startDate: '2026-01-16', endDate: '2026-01-20', dependencies: [{ taskId: 'G', type: 'FS', lag: 0 }] }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'B']));
  });

  it('skips a self-loop when a leaf depends on its own parent group', () => {
    const tasks = [
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-12' }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07', parentId: 'P', dependencies: [{ taskId: 'P', type: 'FS', lag: 0 }] }),
    ];
    expect(() => computeCriticalPath(tasks)).not.toThrow();
    expect(computeCriticalPath(tasks)).toEqual(new Set());
  });

  it('expands non-FS dependencies on a parent group to its leaf descendants', () => {
    const tasks = [
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-15' }),
      makeTask({ id: 'A1', startDate: '2026-01-05', endDate: '2026-01-07', parentId: 'P' }),
      makeTask({ id: 'A2', startDate: '2026-01-08', endDate: '2026-01-12', parentId: 'P' }),
      makeTask({ id: 'B', startDate: '2026-01-13', endDate: '2026-01-15', dependencies: [{ taskId: 'P', type: 'SS', lag: 0 }] }),
    ];
    // SS on a parent group is expanded to every descendant leaf (A2 stays critical;
    // B starts together with the group, so it is not critical).
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A2']));
  });

  it('uses business days for task weight when businessDays=true', () => {
    const tasks = [
      // A: Mon..Sun = 7 calendar days, 5 business days
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-11' }),
      // B: Mon..Fri = 5 calendar days, 5 business days
      makeTask({ id: 'B', startDate: '2026-01-05', endDate: '2026-01-09' }),
      makeTask({ id: 'C', startDate: '2026-01-12', endDate: '2026-01-14', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }, { taskId: 'B', type: 'FS', lag: 0 }] }),
    ];
    // With business days both branches weigh 5 => both critical.
    expect(computeCriticalPath(tasks, { businessDays: true, weekendPredicate: isWeekend })).toEqual(new Set(['A', 'B', 'C']));
    // With calendar days branch A weighs 7 > 5 => only A and C critical.
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'C']));
  });
});

describe('extendCriticalIdsToParents', () => {
  it('lifts criticality up the parent chain', () => {
    const tasks = [
      makeTask({ id: 'G', startDate: '2026-01-05', endDate: '2026-01-14' }),
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-12', parentId: 'G' }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07', parentId: 'P' }),
      makeTask({ id: 'Q', startDate: '2026-01-08', endDate: '2026-01-10' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', parentId: 'Q' }),
    ];
    expect(extendCriticalIdsToParents(new Set(['A']), tasks)).toEqual(new Set(['A', 'P', 'G']));
  });
});

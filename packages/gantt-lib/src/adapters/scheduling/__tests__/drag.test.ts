import { describe, it, expect } from 'vitest';
import { resolveDateRangeFromPixels, clampDateRangeForIncomingFS } from '../drag';
import type { Task } from '../../../core/scheduling/types';

describe('resolveDateRangeFromPixels', () => {
  const monthStart = new Date(Date.UTC(2024, 0, 1)); // Jan 1, 2024
  const dayWidth = 30;
  const task: Task = { id: '1', name: 'Test', startDate: '2024-01-01', endDate: '2024-01-05' };

  it('converts move mode pixels to date range', () => {
    // left=0, width=150 → 5 days starting from month start
    const result = resolveDateRangeFromPixels('move', 0, 150, monthStart, dayWidth, task);
    expect(result.start.getUTCFullYear()).toBe(2024);
    expect(result.start.getUTCMonth()).toBe(0);
    expect(result.start.getUTCDate()).toBe(1);
    expect(result.end.getUTCDate()).toBe(5);
  });

  it('converts resize-right mode pixels', () => {
    // left=0, width=60 → 2 days
    const result = resolveDateRangeFromPixels('resize-right', 0, 60, monthStart, dayWidth, task);
    expect(result).toHaveProperty('start');
    expect(result).toHaveProperty('end');
    expect(result.start.getUTCDate()).toBe(1);
    expect(result.end.getUTCDate()).toBe(2);
  });

  it('converts resize-left mode pixels', () => {
    // left=30 (day 2), width=90 (3 days) → Jan 2-4
    const result = resolveDateRangeFromPixels('resize-left', 30, 90, monthStart, dayWidth, task);
    expect(result).toHaveProperty('start');
    expect(result).toHaveProperty('end');
    expect(result.start.getUTCDate()).toBe(2);
    expect(result.end.getUTCDate()).toBe(4);
  });

  it('offsets start date from non-zero left position in move mode', () => {
    // left=60 (day 3), width=150 (5 days) → Jan 3-7
    const result = resolveDateRangeFromPixels('move', 60, 150, monthStart, dayWidth, task);
    expect(result.start.getUTCDate()).toBe(3);
    expect(result.end.getUTCDate()).toBe(7);
  });

  it('returns correct range without business days', () => {
    const result = resolveDateRangeFromPixels('move', 30, 60, monthStart, dayWidth, task);
    expect(result.start.getUTCDate()).toBe(2);
    expect(result.end.getUTCDate()).toBe(3);
  });
});

describe('clampDateRangeForIncomingFS', () => {
  const task: Task = {
    id: '1',
    name: 'Test',
    startDate: '2024-01-06',
    endDate: '2024-01-10',
    dependencies: [{ taskId: 'pred', type: 'FS', lag: 0 }],
  };
  const predecessor: Task = { id: 'pred', name: 'Pred', startDate: '2024-01-01', endDate: '2024-01-05' };
  const allTasks = [task, predecessor];

  it('returns range unchanged for resize-right mode', () => {
    const range = { start: new Date('2024-01-01'), end: new Date('2024-01-05') };
    const result = clampDateRangeForIncomingFS(task, range, allTasks, 'resize-right');
    expect(result.start.getTime()).toBe(range.start.getTime());
    expect(result.end.getTime()).toBe(range.end.getTime());
  });

  it('clamps start for move mode when violating FS constraint', () => {
    // Task has FS dep on predecessor ending Jan 5, lag=0.
    // calculateSuccessorDate(FS, -5) = Jan 5 + (-5+1) = Jan 1 → minAllowedStart = Jan 1.
    // Range start=Jan 2 is after Jan 1 → not clamped. Verify range unchanged.
    const range = { start: new Date('2024-01-02'), end: new Date('2024-01-06') };
    const result = clampDateRangeForIncomingFS(task, range, allTasks, 'move');
    expect(result.start.getUTCDate()).toBe(2);
    expect(result.end.getUTCDate()).toBe(6);
  });

  it('clamps start when range starts before minimum allowed by FS constraint', () => {
    // predecessor (Jan 10-15, 6 days), successor with FS lag=0
    // calculateSuccessorDate(FS, -6) = Jan 15 + (-6+1) = Jan 10 → minAllowedStart = Jan 10
    // Proposed range starts Jan 5 → should be clamped to Jan 10
    const shortPred: Task = { id: 'sp', name: 'ShortPred', startDate: '2024-01-10', endDate: '2024-01-15' };
    const constrainedTask: Task = {
      id: 'ct',
      name: 'Constrained',
      startDate: '2024-01-16',
      endDate: '2024-01-20',
      dependencies: [{ taskId: 'sp', type: 'FS', lag: 0 }],
    };
    const range = { start: new Date('2024-01-05'), end: new Date('2024-01-09') };
    const result = clampDateRangeForIncomingFS(constrainedTask, range, [constrainedTask, shortPred], 'move');
    expect(result.start.getUTCDate()).toBeGreaterThanOrEqual(10);
  });

  it('returns range unchanged when no dependencies', () => {
    const freeTask: Task = { id: 'free', name: 'Free', startDate: '2024-01-01', endDate: '2024-01-05' };
    const range = { start: new Date('2024-01-03'), end: new Date('2024-01-07') };
    const result = clampDateRangeForIncomingFS(freeTask, range, [freeTask], 'move');
    expect(result.start.getTime()).toBe(range.start.getTime());
    expect(result.end.getTime()).toBe(range.end.getTime());
  });
});

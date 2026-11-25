// @vitest-environment node
// START_MODULE_CONTRACT
// PURPOSE: Verify fixed boundary scheduling and successor dates.
// SCOPE: Parent rollups, independent anchors, leaf dates, milestones and conflicts.
// INPUTS: Isolated task graphs and calendar mode.
// OUTPUTS: Assertions on ranges and unchanged dependency identity.
// DEPENDS: vitest, scheduling, hierarchyOrder
// LINKS: M-SCHEDULING
// END_MODULE_CONTRACT
import { describe, expect, it } from 'vitest';
import type { Task } from '../../types';
import { recalculateProjectSchedule, recalculateTaskFromDependencies } from '../execute';
import { universalCascade } from '../cascade';
import { reflowTasksOnModeSwitch } from '../modeSwitch';
import { normalizeHierarchyTasks } from '../../../utils/hierarchyOrder';
import { resolveDateRangeFromPixels } from '../../../adapters/scheduling/drag';
import { scaleTaskSubtreeDuration } from '../subtreeScaling';

const t = (id: string, startDate: string, endDate: string, extra: Partial<Task> = {}): Task => ({ id, name: id, startDate, endDate, ...extra });
const base = () => [
  t('parent', '2026-10-05', '2026-12-30', { fixedStartDate: '2026-10-05', fixedEndDate: '2026-12-30' }),
  t('a', '2026-10-05', '2026-10-07', { parentId: 'parent' }),
  t('b', '2026-10-08', '2026-10-09', { parentId: 'parent' }),
  t('next', '2026-12-31', '2027-01-01', { dependencies: [{ taskId: 'parent', type: 'FS', lag: 0 }] }),
];
const apply = (tasks: Task[], changes: Task[]) => tasks.map(task => changes.find(x => x.id === task.id) ?? task);
const dates = (tasks: Task[], id: string) => { const x = tasks.find(task => task.id === id)!; return [x.startDate, x.endDate]; };

describe('independent fixed dates', () => {
  it('retains the 87-day parent and outgoing link through rollup and full reflow', () => {
    const tasks = base();
    expect(dates(normalizeHierarchyTasks(tasks), 'parent')).toEqual(['2026-10-05', '2026-12-30']);
    const result = apply(tasks, recalculateProjectSchedule(tasks).changedTasks);
    expect(dates(result, 'parent')).toEqual(['2026-10-05', '2026-12-30']);
    expect(dates(result, 'next')).toEqual(['2026-12-31', '2027-01-01']);
    expect(result[3].dependencies).toEqual(tasks[3].dependencies);
  });
  it('uses the computed free end when scheduling a successor', () => {
    const tasks = base();
    tasks[0].fixedEndDate = null;
    const result = apply(tasks, recalculateProjectSchedule(tasks).changedTasks);
    expect(dates(result, 'parent')).toEqual(['2026-10-05', '2026-10-09']);
    expect(dates(result, 'next')).toEqual(['2026-10-10', '2026-10-11']);
  });
  it('keeps the fixed parent end when a child moves', () => {
    const tasks = base();
    const changed = universalCascade(tasks[1], new Date('2026-10-12'), new Date('2026-10-14'), tasks);
    const result = apply(tasks, changed);
    expect(dates(result, 'parent')).toEqual(['2026-10-05', '2026-12-30']);
    expect(dates(result, 'next')).toEqual(['2026-12-31', '2027-01-01']);
  });
  it('preserves anchors on calendar changes and milestones', () => {
    const tasks = [...base(), t('m', '2026-10-10', '2026-10-10', { type: 'milestone', fixedEndDate: '2026-10-10' })];
    const result = reflowTasksOnModeSwitch(tasks, true, date => [0, 6].includes(date.getUTCDay()));
    expect(dates(result, 'parent')).toEqual(['2026-10-05', '2026-12-30']);
    expect(dates(result, 'm')).toEqual(['2026-10-10', '2026-10-10']);
  });
  it('rejects inverted fixed dates', () => {
    const tasks = base(); tasks[0].fixedEndDate = '2026-10-01';
    expect(() => recalculateProjectSchedule(tasks)).toThrow(/Fixed dates conflict/);
  });
});

it('uses each fixed source endpoint without imposing a false hierarchy cycle', () => {
  const parent = t('p', '2026-10-05', '2026-12-30', { fixedStartDate: '2026-10-05', fixedEndDate: '2026-12-30' });
  for (const type of ['FS', 'SS', 'FF', 'SF'] as const) {
    const tasks = [parent, t('outside', '2027-01-01', '2027-01-01', { dependencies: [{ taskId: 'p', type, lag: 2 }] }),
      t('child', '2026-10-05', '2026-10-06', { parentId: 'p', dependencies: [{ taskId: 'outside', type: 'SS', lag: 0 }] })];
    const result = apply(tasks, recalculateProjectSchedule(tasks).changedTasks);
    expect(dates(result, 'p')).toEqual(['2026-10-05', '2026-12-30']);
    expect(result[1].dependencies).toEqual(tasks[1].dependencies);
    const expected = type === 'FS' ? '2027-01-02' : type === 'FF' ? '2027-01-01' : type === 'SS' ? '2026-10-07' : '2026-10-06';
    expect(result[1].startDate).toBe(expected);
  }
});

it('preserves a fixed end with a free parent start after deleting a child', () => {
  const tasks = base(); tasks[0].fixedStartDate = null;
  const remaining = tasks.filter(task => task.id !== 'a');
  const result = apply(remaining, recalculateProjectSchedule(remaining).changedTasks);
  expect(dates(result, 'parent')).toEqual(['2026-10-08', '2026-12-30']);
});

it('keeps a pinned leaf and its incoming lag under dependency recalculation', () => {
  const tasks = [t('pred', '2026-10-01', '2026-10-20'),
    t('fixed', '2026-10-05', '2026-10-07', { fixedStartDate: '2026-10-05', dependencies: [{ taskId: 'pred', type: 'FS', lag: 3 }] })];
  const result = apply(tasks, recalculateProjectSchedule(tasks).changedTasks);
  expect(dates(result, 'fixed')).toEqual(['2026-10-05', '2026-10-07']);
  expect(result[1].dependencies).toEqual(tasks[1].dependencies);
});

it('keeps fixed edges on drag and permits resizing the free leaf edge', () => {
  const task = t('fixed', '2026-10-05', '2026-10-07', { fixedStartDate: '2026-10-05' });
  const month = new Date('2026-10-01T00:00:00Z');
  const moved = resolveDateRangeFromPixels('move', 10, 3, month, 1, task);
  expect(moved.start.toISOString().slice(0, 10)).toBe('2026-10-05');
  expect(moved.end.toISOString().slice(0, 10)).toBe('2026-10-07');
  const resized = resolveDateRangeFromPixels('resize-right', 4, 6, month, 1, task);
  expect(resized.start.toISOString().slice(0, 10)).toBe('2026-10-05');
  expect(resized.end.toISOString().slice(0, 10)).toBe('2026-10-10');
});

it('rejects a subtree scaling result that moves a fixed boundary', () => {
  const tasks = base();
  const result = scaleTaskSubtreeDuration('parent', 3, tasks);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('FIXED_DATE_CONFLICT');
});

it('applies incoming FF to the free parent end before scheduling its FS successor', () => {
  const tasks = base();
  tasks[0].fixedEndDate = null;
  tasks[0].dependencies = [{ taskId: 'pred', type: 'FF', lag: 0 }];
  tasks.push(t('pred', '2026-10-15', '2026-10-15'));
  const result = apply(tasks, recalculateProjectSchedule(tasks).changedTasks);
  expect(dates(result, 'parent')).toEqual(['2026-10-05', '2026-10-15']);
  expect(dates(result, 'next')).toEqual(['2026-10-16', '2026-10-17']);
  expect(dates(normalizeHierarchyTasks(result), 'parent')).toEqual(['2026-10-05', '2026-10-15']);
  expect(result[0].dependencies).toEqual(tasks[0].dependencies);
  const oneTask = apply(tasks, recalculateTaskFromDependencies('parent', tasks).changedTasks);
  expect(dates(oneTask, 'parent')).toEqual(['2026-10-05', '2026-10-15']);
  expect(dates(oneTask, 'a')).toEqual(['2026-10-05', '2026-10-07']);
  expect(dates(oneTask, 'next')).toEqual(['2026-10-16', '2026-10-17']);
  const moved = universalCascade(tasks[4], new Date('2026-10-18'), new Date('2026-10-18'), tasks);
  const cascaded = apply(tasks, moved);
  expect(dates(cascaded, 'parent')).toEqual(['2026-10-05', '2026-10-18']);
  expect(dates(cascaded, 'a')).toEqual(['2026-10-05', '2026-10-07']);
  expect(dates(cascaded, 'next')).toEqual(['2026-10-19', '2026-10-20']);
});

it('applies incoming SS to the free parent start without rewriting a fixed end', () => {
  const tasks = base();
  tasks[0].fixedStartDate = null;
  tasks[0].dependencies = [{ taskId: 'pred', type: 'SS', lag: 0 }];
  tasks.push(t('pred', '2026-10-07', '2026-10-15'));
  const result = apply(tasks, recalculateProjectSchedule(tasks).changedTasks);
  expect(dates(result, 'parent')).toEqual(['2026-10-07', '2026-12-30']);
  expect(dates(normalizeHierarchyTasks(result), 'parent')).toEqual(['2026-10-07', '2026-12-30']);
  expect(result[0].dependencies).toEqual(tasks[0].dependencies);
});

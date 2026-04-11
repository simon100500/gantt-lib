import { describe, expect, it, expectTypeOf } from 'vitest';

import type { Task as GanttTask } from '../components/GanttChart/GanttChart';
import type { Task as PublicTask } from '../types';
import {
  TASK_TYPE_DEFAULT,
  getTaskType,
  isMilestoneTask,
  normalizeTaskDatesForType,
} from '../utils/taskType';

describe('taskType helpers', () => {
  it('defaults undefined type to task', () => {
    const task: PublicTask = {
      id: 'task-1',
      name: 'Regular task',
      startDate: '2026-04-10',
      endDate: '2026-04-10',
    };

    expect(TASK_TYPE_DEFAULT).toBe('task');
    expect(getTaskType(task)).toBe('task');
    expect(isMilestoneTask(task)).toBe(false);
  });

  it('preserves explicit milestone type and normalizes milestone end date to start date', () => {
    const task: GanttTask = {
      id: 'milestone-1',
      name: 'Launch',
      startDate: '2026-04-10T12:30:00+03:00',
      endDate: '2026-04-12T09:00:00+03:00',
      type: 'milestone',
    };

    const normalized = normalizeTaskDatesForType(task);

    expect(getTaskType(task)).toBe('milestone');
    expect(isMilestoneTask(task)).toBe(true);
    expect(normalized).not.toBe(task);
    expect(normalized.endDate).toBe('2026-04-10');
    expect(normalized.startDate).toBe(task.startDate);
  });

  it('leaves non-milestone tasks unchanged', () => {
    const task: PublicTask = {
      id: 'task-2',
      name: 'Same-day task',
      startDate: '2026-04-10',
      endDate: '2026-04-10',
      type: 'task',
    };

    expect(normalizeTaskDatesForType(task)).toBe(task);
  });

  it('exposes task and milestone in both public task contracts', () => {
    expectTypeOf<GanttTask['type']>().toEqualTypeOf<'task' | 'milestone' | undefined>();
    expectTypeOf<PublicTask['type']>().toEqualTypeOf<'task' | 'milestone' | undefined>();
  });
});

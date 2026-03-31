// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { ScheduleTask, ScheduleCommandOptions, ScheduleCommandResult, ScheduleDependency } from '../types';
import type { Task } from '../types';

describe('ScheduleTask type acceptance', () => {
  it('accepts minimal shape (id, startDate, endDate)', () => {
    const task: ScheduleTask = { id: '1', startDate: '2024-01-01', endDate: '2024-01-05' };
    expect(task.id).toBe('1');
  });

  it('accepts full shape with optional fields', () => {
    const task: ScheduleTask = {
      id: '1', startDate: '2024-01-01', endDate: '2024-01-05',
      dependencies: [{ taskId: '2', type: 'FS', lag: 0 }],
      parentId: 'p1', locked: false, progress: 50,
    };
    expect(task.dependencies!.length).toBe(1);
  });

  it('ScheduleCommandOptions compiles', () => {
    const opts: ScheduleCommandOptions = { businessDays: true, skipCascade: false };
    expect(opts.businessDays).toBe(true);
  });

  it('ScheduleCommandResult type works', () => {
    const result: ScheduleCommandResult = { changedTasks: [], changedIds: [] };
    expect(result.changedIds).toEqual([]);
  });

  it('ScheduleDependency type works', () => {
    const dep: ScheduleDependency = { type: 'FS', taskId: '2', lag: 3 };
    expect(dep.type).toBe('FS');
  });

  it('ScheduleTask is assignable from full Task', () => {
    const fullTask: Task = {
      id: '1', name: 'Test', startDate: '2024-01-01', endDate: '2024-01-05',
    };
    const schedTask: ScheduleTask = fullTask;
    expect(schedTask.id).toBe('1');
  });
});

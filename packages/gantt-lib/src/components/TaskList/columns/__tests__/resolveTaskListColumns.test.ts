import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { resolveTaskListColumns } from '../resolveTaskListColumns';
import type { TaskListColumn, BuiltInTaskListColumnId } from '../types';
import type { Task } from '../../GanttChart';

const builtIn: TaskListColumn<Task>[] = [
  { id: 'number', header: '#', renderCell: () => null },
  { id: 'name', header: 'Name', renderCell: () => null },
  { id: 'startDate', header: 'Start', renderCell: () => null },
  { id: 'endDate', header: 'End', renderCell: () => null },
  { id: 'duration', header: 'Dur', renderCell: () => null },
  { id: 'progress', header: '%', renderCell: () => null },
  { id: 'dependencies', header: 'Deps', renderCell: () => null },
  { id: 'actions', header: 'Act', renderCell: () => null },
];

describe('resolveTaskListColumns', () => {
  it('inserts custom column with { after: "name" } at index after name', () => {
    const custom: TaskListColumn<Task>[] = [
      { id: 'assignee', header: 'Assignee', after: 'name', renderCell: () => null },
    ];

    const result = resolveTaskListColumns(builtIn, custom);
    const ids = result.map(c => c.id);

    const nameIndex = ids.indexOf('name');
    const assigneeIndex = ids.indexOf('assignee');
    expect(assigneeIndex).toBe(nameIndex + 1);
  });

  it('inserts custom column with { before: "startDate" } at index before startDate', () => {
    const custom: TaskListColumn<Task>[] = [
      { id: 'priority', header: 'Priority', before: 'startDate', renderCell: () => null },
    ];

    const result = resolveTaskListColumns(builtIn, custom);
    const ids = result.map(c => c.id);

    const startDateIndex = ids.indexOf('startDate');
    expect(startDateIndex).toBeGreaterThanOrEqual(0);
    const priorityIndex = ids.indexOf('priority');
    expect(priorityIndex).toBeGreaterThanOrEqual(0);
    expect(priorityIndex).toBe(startDateIndex);
  });

  it('inserts custom column with { after: "progress" } after progress', () => {
    const custom: TaskListColumn<Task>[] = [
      { id: 'status', header: 'Status', after: 'progress', renderCell: () => null },
    ];

    const result = resolveTaskListColumns(builtIn, custom);
    const ids = result.map(c => c.id);

    const progressIndex = ids.indexOf('progress');
    const statusIndex = ids.indexOf('status');
    expect(statusIndex).toBe(progressIndex + 1);
  });

  it('defaults to after "name" when no anchor is provided', () => {
    const custom: TaskListColumn<Task>[] = [
      { id: 'custom', header: 'Custom', renderCell: () => null },
    ];

    const result = resolveTaskListColumns(builtIn, custom);
    const ids = result.map(c => c.id);

    const nameIndex = ids.indexOf('name');
    const customIndex = ids.indexOf('custom');
    expect(customIndex).toBe(nameIndex + 1);
  });

  it('falls back to after "name" when anchor target does not exist', () => {
    const custom: TaskListColumn<Task>[] = [
      { id: 'custom', header: 'Custom', after: 'nonexistent', renderCell: () => null },
    ];

    const result = resolveTaskListColumns(builtIn, custom);
    const ids = result.map(c => c.id);

    const nameIndex = ids.indexOf('name');
    const customIndex = ids.indexOf('custom');
    expect(customIndex).toBe(nameIndex + 1);
  });

  it('preserves consumer-provided order for multiple custom columns with same anchor', () => {
    const custom: TaskListColumn<Task>[] = [
      { id: 'col-a', header: 'A', after: 'name', renderCell: () => null },
      { id: 'col-b', header: 'B', after: 'name', renderCell: () => null },
      { id: 'col-c', header: 'C', after: 'name', renderCell: () => null },
    ];

    const result = resolveTaskListColumns(builtIn, custom);
    const ids = result.map(c => c.id);

    const aIndex = ids.indexOf('col-a');
    const bIndex = ids.indexOf('col-b');
    const cIndex = ids.indexOf('col-c');
    expect(aIndex).toBeLessThan(bIndex);
    expect(bIndex).toBeLessThan(cIndex);
  });

  it('logs console.error for duplicate column ids in dev mode', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const custom: TaskListColumn<Task>[] = [
      { id: 'number', header: 'Dup', renderCell: () => null },
    ];

    resolveTaskListColumns(builtIn, custom);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Duplicate column id'),
      expect.stringContaining('"number"')
    );

    consoleSpy.mockRestore();
  });

  it('returns built-in columns unchanged when no custom columns provided', () => {
    const result = resolveTaskListColumns(builtIn, []);

    expect(result).toHaveLength(builtIn.length);
    expect(result.map(c => c.id)).toEqual(builtIn.map(c => c.id));
  });
});

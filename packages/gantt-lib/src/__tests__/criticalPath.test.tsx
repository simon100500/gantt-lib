import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { GanttChart, type Task } from '../components/GanttChart';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makeTask(partial: Partial<Task> & { id: string; startDate: string; endDate: string; dependencies?: Task['dependencies']; parentId?: string }): Task {
  return { name: partial.id, ...partial } as Task;
}

function getBar(container: HTMLElement, taskId: string) {
  return container.querySelector(`[data-gantt-task-row-id="${taskId}"] [data-taskbar]`) as HTMLElement | null;
}

function getRow(container: HTMLElement, taskId: string) {
  return container.querySelector(`[data-gantt-task-row-id="${taskId}"]`) as HTMLElement | null;
}

describe('GanttChart criticalPathMode', () => {
  it('highlight mode paints critical bars and leaves non-critical bars untouched', () => {
    const tasks: Task[] = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'D', startDate: '2026-01-05', endDate: '2026-01-06' }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} criticalPathMode="highlight" rowHeight={36} headerHeight={36} />
    );

    expect(getBar(container, 'A')?.style.backgroundColor).toBe('var(--gantt-critical-path-color, #dc2626)');
    expect(getBar(container, 'B')?.style.backgroundColor).toBe('var(--gantt-critical-path-color, #dc2626)');
    expect(getBar(container, 'C')?.style.backgroundColor).toBe('var(--gantt-critical-path-color, #dc2626)');
    expect(getBar(container, 'D')?.style.backgroundColor).toBe('var(--gantt-task-bar-default-color)');
  });

  it('highlight mode marks the FS chain lines as critical', () => {
    const tasks: Task[] = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }] }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} criticalPathMode="highlight" rowHeight={36} headerHeight={36} />
    );

    expect(container.querySelectorAll('.gantt-dependency-critical').length).toBe(2);
  });

  it('hide mode keeps only critical tasks and their parents', () => {
    const tasks: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-13' }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07', parentId: 'P' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', parentId: 'P', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'D', startDate: '2026-01-05', endDate: '2026-01-06' }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} criticalPathMode="hide" rowHeight={36} headerHeight={36} />
    );

    expect(getRow(container, 'P')).not.toBeNull();
    expect(getRow(container, 'A')).not.toBeNull();
    expect(getRow(container, 'B')).not.toBeNull();
    expect(getRow(container, 'D')).toBeNull();
  });

  it('does not filter rows when criticalPathMode is off', () => {
    const tasks: Task[] = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'D', startDate: '2026-01-05', endDate: '2026-01-06' }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} rowHeight={36} headerHeight={36} />
    );

    expect(getRow(container, 'A')).not.toBeNull();
    expect(getRow(container, 'D')).not.toBeNull();
  });
});

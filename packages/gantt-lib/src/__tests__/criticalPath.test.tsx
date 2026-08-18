import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
  it('highlight mode marks critical bars with the critical-path class', () => {
    const tasks: Task[] = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'D', startDate: '2026-01-05', endDate: '2026-01-06' }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} criticalPathMode="highlight" rowHeight={36} headerHeight={36} />
    );

    expect(getBar(container, 'A')?.classList.contains('gantt-tr-critical')).toBe(true);
    expect(getBar(container, 'B')?.classList.contains('gantt-tr-critical')).toBe(true);
    expect(getBar(container, 'C')?.classList.contains('gantt-tr-critical')).toBe(true);
    expect(getBar(container, 'D')?.classList.contains('gantt-tr-critical')).toBe(false);
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

  it('hide mode filters task list rows so the container height shrinks', () => {
    const tasks: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-13' }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07', parentId: 'P' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', parentId: 'P', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'D', startDate: '2026-01-05', endDate: '2026-01-06' }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} criticalPathMode="hide" rowHeight={36} headerHeight={36} showTaskList={true} />
    );

    expect(getRow(container, 'P')).not.toBeNull();
    expect(getRow(container, 'A')).not.toBeNull();
    expect(getRow(container, 'B')).not.toBeNull();
    expect(getRow(container, 'D')).toBeNull();

    const body = container.querySelector('.gantt-tl-body') as HTMLElement | null;
    expect(body).not.toBeNull();
    expect(body!.style.height).toBe('108px');
  });

  it('hide mode removes dependency arrows touching hidden non-critical tasks', () => {
    const tasks: Task[] = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'D', startDate: '2026-01-05', endDate: '2026-01-06', dependencies: [{ taskId: 'A', type: 'SS', lag: 0 }] }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} criticalPathMode="hide" rowHeight={36} headerHeight={36} />
    );

    expect(getRow(container, 'D')).toBeNull();
    expect(container.querySelectorAll('.gantt-dependency-path').length).toBe(2);
  });

  it('highlight mode paints critical rows yellow in both the grid and the task list', () => {
    const tasks: Task[] = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'D', startDate: '2026-01-05', endDate: '2026-01-06' }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} criticalPathMode="highlight" rowHeight={36} headerHeight={36} showTaskList={true} />
    );

    const gridRowA = container.querySelector('.gantt-tr-row[data-gantt-task-row-id="A"]');
    expect(gridRowA?.classList.contains('gantt-tr-row-filter-match')).toBe(true);
    const listRowA = container.querySelector('.gantt-tl-row[data-gantt-task-row-id="A"]');
    expect(listRowA?.classList.contains('gantt-tl-row-filter-match')).toBe(true);

    const gridRowD = container.querySelector('.gantt-tr-row[data-gantt-task-row-id="D"]');
    expect(gridRowD?.classList.contains('gantt-tr-row-filter-match')).toBe(false);
  });

  it('hide mode paints critical bars red but does not yellow-highlight rows', () => {
    const tasks: Task[] = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} criticalPathMode="hide" rowHeight={36} headerHeight={36} showTaskList={true} />
    );

    const gridRowA = container.querySelector('.gantt-tr-row[data-gantt-task-row-id="A"]');
    expect(gridRowA?.classList.contains('gantt-tr-row-filter-match')).toBe(false);
    const listRowA = container.querySelector('.gantt-tl-row[data-gantt-task-row-id="A"]');
    expect(listRowA?.classList.contains('gantt-tl-row-filter-match')).toBe(false);
  });

  it('hide mode removes arrows going UP from a lower critical task to a hidden non-critical task above', () => {
    const tasks: Task[] = [
      makeTask({ id: 'D', startDate: '2026-01-11', endDate: '2026-01-12', dependencies: [{ taskId: 'C', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }] }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} criticalPathMode="hide" rowHeight={36} headerHeight={36} />
    );

    expect(getRow(container, 'D')).toBeNull();
    expect(container.querySelectorAll('.gantt-dependency-path').length).toBe(2);
  });
});

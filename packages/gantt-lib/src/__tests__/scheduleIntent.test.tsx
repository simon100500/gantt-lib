import '@testing-library/jest-dom/vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GanttChart, type GanttScheduleIntent, type Task } from '../components/GanttChart';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'startDate' | 'endDate'>): Task {
  return { name: partial.id, ...partial };
}

const childDurationFixture: Task[] = [
  task({ id: 'parent', startDate: '2026-01-01', endDate: '2026-01-10' }),
  task({ id: 'child-a', startDate: '2026-01-01', endDate: '2026-01-10', parentId: 'parent' }),
  task({ id: 'child-b', startDate: '2026-01-01', endDate: '2026-01-08', parentId: 'parent' }),
];

const parentFixture: Task[] = [
  task({ id: 'parent', startDate: '2026-01-01', endDate: '2026-01-10' }),
  task({ id: 'child-a', startDate: '2026-01-01', endDate: '2026-01-10', parentId: 'parent' }),
  task({ id: 'child-b', startDate: '2026-01-01', endDate: '2026-01-08', parentId: 'parent' }),
];

function mockBarRect(bar: HTMLElement, width: number) {
  Object.defineProperty(bar, 'getBoundingClientRect', {
    value: () => ({ left: 0, width, right: width, top: 0, height: 40, bottom: 40 }),
    configurable: true,
  });
}

function getBar(container: HTMLElement, taskId: string): HTMLElement {
  return container.querySelector(`[data-gantt-task-row-id="${taskId}"] [data-taskbar]`) as HTMLElement;
}

function getDependencyPath(container: HTMLElement): string | null {
  return container.querySelector('.gantt-dependency-path')?.getAttribute('d') ?? null;
}

describe('GanttScheduleIntent', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0) as unknown as number);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('emits one leaf duration intent without persisting the materialized parent cascade', async () => {
    const onScheduleIntent = vi.fn<(intent: GanttScheduleIntent) => void>();
    const onTasksChange = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={childDurationFixture}
        showTaskList
        businessDays={false}
        onScheduleIntent={onScheduleIntent}
        onTasksChange={onTasksChange}
      />
    );

    const durationCell = container.querySelector(
      '[data-gantt-task-row-id="child-a"] .gantt-tl-cell-duration'
    ) as HTMLElement;
    fireEvent.click(durationCell);

    const input = durationCell.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onScheduleIntent).toHaveBeenCalledTimes(1);
    });

    expect(onScheduleIntent).toHaveBeenCalledWith({
      type: 'change_duration',
      taskId: 'child-a',
      duration: 5,
      anchor: 'start',
      taskType: 'task',
    });
    expect(onTasksChange).not.toHaveBeenCalled();
  });

  it('emits one move intent for a child and suppresses the materialized cascade', async () => {
    const onScheduleIntent = vi.fn<(intent: GanttScheduleIntent) => void>();
    const onTasksChange = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={parentFixture}
        dayWidth={40}
        businessDays={false}
        onScheduleIntent={onScheduleIntent}
        onTasksChange={onTasksChange}
      />
    );
    const bar = getBar(container, 'child-a');
    mockBarRect(bar, 10 * 40);
    fireEvent.mouseDown(bar, { clientX: 5 * 40 });
    fireEvent.mouseMove(window, { clientX: 5 * 40 + 2 * 40 });
    await waitFor(() => expect(bar).toHaveClass('gantt-tr-dragging'));
    fireEvent.mouseUp(window);

    await waitFor(() => expect(onScheduleIntent).toHaveBeenCalledTimes(1));
    expect(onScheduleIntent).toHaveBeenCalledWith({
      type: 'move_task', taskId: 'child-a', startDate: '2026-01-03',
    });
    expect(onTasksChange).not.toHaveBeenCalled();
  });

  it('drops stale drag coordinates when the controlled schedule is replaced', async () => {
    const initialTasks = [
      task({ id: 'predecessor', startDate: '2026-01-01', endDate: '2026-01-02' }),
      task({
        id: 'successor',
        startDate: '2026-01-03',
        endDate: '2026-01-04',
        dependencies: [{ taskId: 'predecessor', type: 'FS', lag: 0 }],
      }),
    ];
    const authoritativeTasks = [
      task({ id: 'predecessor', startDate: '2026-01-08', endDate: '2026-01-09' }),
      task({
        id: 'successor',
        startDate: '2026-01-10',
        endDate: '2026-01-11',
        dependencies: [{ taskId: 'predecessor', type: 'FS', lag: 0 }],
      }),
    ];
    const onScheduleIntent = vi.fn<(intent: GanttScheduleIntent) => void>();
    const { container, rerender } = render(
      <GanttChart
        tasks={initialTasks}
        dayWidth={40}
        businessDays={false}
        onScheduleIntent={onScheduleIntent}
      />
    );

    const predecessorBar = getBar(container, 'predecessor');
    mockBarRect(predecessorBar, 2 * 40);
    fireEvent.mouseDown(predecessorBar, { clientX: 40 });
    fireEvent.mouseMove(window, { clientX: 3 * 40 });
    await waitFor(() => expect(predecessorBar).toHaveClass('gantt-tr-dragging'));

    rerender(
      <GanttChart
        tasks={authoritativeTasks}
        dayWidth={40}
        businessDays={false}
        onScheduleIntent={onScheduleIntent}
      />
    );

    await waitFor(() => {
      expect(getBar(container, 'predecessor')).toHaveStyle({ left: '280px' });
      expect(getDependencyPath(container)).toBe('M 360 30 V 46');
    });
    fireEvent.mouseUp(window);
    expect(onScheduleIntent).not.toHaveBeenCalled();
  });

  it('emits one move intent for a parent move', async () => {
    const onScheduleIntent = vi.fn<(intent: GanttScheduleIntent) => void>();
    const onTasksChange = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={parentFixture}
        dayWidth={40}
        businessDays={false}
        onScheduleIntent={onScheduleIntent}
        onTasksChange={onTasksChange}
      />
    );
    const bar = getBar(container, 'parent');
    mockBarRect(bar, 10 * 40);
    fireEvent.mouseDown(bar, { clientX: 5 * 40 });
    fireEvent.mouseMove(window, { clientX: 5 * 40 + 2 * 40 });
    await waitFor(() => expect(bar).toHaveClass('gantt-tr-dragging'));
    fireEvent.mouseUp(window);

    await waitFor(() => expect(onScheduleIntent).toHaveBeenCalledTimes(1));
    expect(onScheduleIntent).toHaveBeenCalledWith({
      type: 'move_task', taskId: 'parent', startDate: '2026-01-03',
    });
    expect(onTasksChange).not.toHaveBeenCalled();
  });

  it('emits one parent duration intent for an edge resize', async () => {
    const onScheduleIntent = vi.fn<(intent: GanttScheduleIntent) => void>();
    const onTasksChange = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={parentFixture}
        dayWidth={40}
        businessDays={false}
        onScheduleIntent={onScheduleIntent}
        onTasksChange={onTasksChange}
      />
    );
    const bar = getBar(container, 'parent');
    mockBarRect(bar, 10 * 40);
    fireEvent.mouseDown(bar, { clientX: 10 * 40 - 5 });
    fireEvent.mouseMove(window, { clientX: 10 * 40 - 5 + 2 * 40 });
    await waitFor(() => expect(bar).toHaveClass('gantt-tr-dragging'));
    fireEvent.mouseUp(window);

    await waitFor(() => expect(onScheduleIntent).toHaveBeenCalledTimes(1));
    expect(onScheduleIntent).toHaveBeenCalledWith({
      type: 'change_duration', taskId: 'parent', duration: 12, anchor: 'start',
    });
    expect(onTasksChange).not.toHaveBeenCalled();
  });

  it('preserves milestone to task transition in the duration intent', async () => {
    const onScheduleIntent = vi.fn<(intent: GanttScheduleIntent) => void>();
    const { container } = render(
      <GanttChart
        tasks={[task({ id: 'milestone', type: 'milestone', startDate: '2026-01-01', endDate: '2026-01-01' })]}
        showTaskList
        businessDays={false}
        onScheduleIntent={onScheduleIntent}
      />
    );

    const durationCell = container.querySelector(
      '[data-gantt-task-row-id="milestone"] .gantt-tl-cell-duration'
    ) as HTMLElement;
    fireEvent.click(durationCell);
    const input = durationCell.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(onScheduleIntent).toHaveBeenCalledTimes(1));
    expect(onScheduleIntent).toHaveBeenCalledWith({
      type: 'change_duration',
      taskId: 'milestone',
      duration: 3,
      anchor: 'start',
      taskType: 'task',
    });
  });

  it('preserves task to milestone transition in the duration intent', async () => {
    const onScheduleIntent = vi.fn<(intent: GanttScheduleIntent) => void>();
    const { container } = render(
      <GanttChart
        tasks={[task({ id: 'task', type: 'task', startDate: '2026-01-01', endDate: '2026-01-03' })]}
        showTaskList
        businessDays={false}
        onScheduleIntent={onScheduleIntent}
      />
    );

    const durationCell = container.querySelector(
      '[data-gantt-task-row-id="task"] .gantt-tl-cell-duration'
    ) as HTMLElement;
    fireEvent.click(durationCell);
    const input = durationCell.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(onScheduleIntent).toHaveBeenCalledTimes(1));
    expect(onScheduleIntent).toHaveBeenCalledWith({
      type: 'change_duration',
      taskId: 'task',
      duration: 0,
      anchor: 'start',
      taskType: 'milestone',
    });
  });

  it('emits change_duration when the parent duration is edited in the task list', async () => {
    const onScheduleIntent = vi.fn<(intent: GanttScheduleIntent) => void>();
    const onTasksChange = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={parentFixture}
        showTaskList
        businessDays={false}
        onScheduleIntent={onScheduleIntent}
        onTasksChange={onTasksChange}
      />
    );
    const durationCell = container.querySelector(
      '[data-gantt-task-row-id="parent"] .gantt-tl-cell-duration'
    ) as HTMLElement;
    fireEvent.click(durationCell);
    const input = durationCell.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(onScheduleIntent).toHaveBeenCalledTimes(1));
    expect(onScheduleIntent).toHaveBeenCalledWith({
      type: 'change_duration', taskId: 'parent', duration: 12, anchor: 'start', taskType: 'task',
    });
    expect(onTasksChange).not.toHaveBeenCalled();
  });

  it('keeps legacy onTasksChange persistence when no intent callback is supplied', async () => {
    const onTasksChange = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={childDurationFixture}
        showTaskList
        businessDays={false}
        onTasksChange={onTasksChange}
      />
    );
    const durationCell = container.querySelector(
      '[data-gantt-task-row-id="child-a"] .gantt-tl-cell-duration'
    ) as HTMLElement;
    fireEvent.click(durationCell);
    const input = durationCell.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(onTasksChange).toHaveBeenCalledTimes(1));
    const changed = onTasksChange.mock.calls[0][0] as Task[];
    expect(changed.some((item) => item.id === 'parent')).toBe(true);
  });
});

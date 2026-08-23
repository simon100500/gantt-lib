import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GanttChart, type Task } from '../components/GanttChart';
import type { ScaleTaskSubtreeResult } from '../core/scheduling';
import { getTaskDuration } from '../core/scheduling';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const DAY_WIDTH = 40;

function makeTask(partial: Partial<Task> & { id: string; startDate: string; endDate: string }): Task {
  return { name: partial.id, ...partial } as Task;
}

/** Scenario 7.1: parent 20 calendar days, leaves 4/6/8, two FS lags of 1 day. */
function makeParentChain(): Task[] {
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

function mockBarRect(bar: HTMLElement, width: number) {
  Object.defineProperty(bar, 'getBoundingClientRect', {
    value: () => ({ left: 0, width, right: width, top: 0, height: 40, bottom: 40 }),
    writable: false,
    configurable: true,
  });
}

function getBar(container: HTMLElement, taskId: string): HTMLElement {
  return container.querySelector(`[data-gantt-task-row-id="${taskId}"] [data-taskbar]`) as HTMLElement;
}

describe('GanttChart parent subtree scaling (parent bar resize)', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(performance.now()), 0) as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      window.clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resizes the parent bar right edge and scales the subtree proportionally (20 -> 30)', async () => {
    const onTasksChange = vi.fn();
    const onSubtreeScaleResult = vi.fn<(result: ScaleTaskSubtreeResult) => void>();
    const { container } = render(
      <GanttChart
        tasks={makeParentChain()}
        dayWidth={DAY_WIDTH}
        rowHeight={36}
        headerHeight={36}
        businessDays={false}
        onTasksChange={onTasksChange}
        onSubtreeScaleResult={onSubtreeScaleResult}
      />
    );

    const parentBar = getBar(container, 'P');
    // Parent bar spans 20 days * 40px = 800px. Grab the right edge (20px zone).
    mockBarRect(parentBar, 20 * DAY_WIDTH);
    fireEvent.mouseDown(parentBar, { clientX: 20 * DAY_WIDTH - 5, clientY: 20, button: 0 });
    // +10 days of pixels
    fireEvent.mouseMove(window, { clientX: 20 * DAY_WIDTH - 5 + 10 * DAY_WIDTH, clientY: 20 });
    await waitFor(() => {
      expect(parentBar).toHaveClass('gantt-tr-dragging');
    });
    fireEvent.mouseUp(window, { clientX: 20 * DAY_WIDTH - 5 + 10 * DAY_WIDTH, clientY: 20 });

    await waitFor(() => {
      expect(onTasksChange).toHaveBeenCalledTimes(1);
    });

    const batch = onTasksChange.mock.calls[0][0] as Task[];
    const byId = new Map(batch.map((t: Task) => [t.id, t]));

    // Parent rescaled to exactly 30 calendar days.
    const parent = byId.get('P')!;
    expect(parent.startDate).toBe('2026-01-01');
    expect(parent.endDate).toBe('2026-01-30');

    // Leaves stretched with the common factor; explicit lags stay at 1 day.
    expect(getTaskDuration(byId.get('A')!.startDate, byId.get('A')!.endDate)).toBe(6);
    expect(getTaskDuration(byId.get('B')!.startDate, byId.get('B')!.endDate)).toBe(9);
    expect(getTaskDuration(byId.get('C')!.startDate, byId.get('C')!.endDate)).toBe(13);
    expect(byId.get('B')!.dependencies?.[0]?.lag).toBe(1);
    expect(byId.get('C')!.dependencies?.[0]?.lag).toBe(1);

    // Structured result surfaced for consumer notifications.
    expect(onSubtreeScaleResult).toHaveBeenCalledTimes(1);
    const scaleResult = onSubtreeScaleResult.mock.calls[0][0];
    expect(scaleResult.ok).toBe(true);
    expect(scaleResult.ok && scaleResult.appliedDuration).toBe(30);
    expect(scaleResult.ok && scaleResult.clamped).toBe(false);
  });

  it('compresses the parent bar and reports TARGET_CLAMPED_TO_MINIMUM when impossible', async () => {
    // FS chain of two 5-day leaves: the minimum reachable span is 2 days.
    const tasks: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
      makeTask({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-05', parentId: 'P' }),
      makeTask({
        id: 'B', startDate: '2026-01-06', endDate: '2026-01-10', parentId: 'P',
        dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
      }),
    ];
    const onTasksChange = vi.fn();
    const onSubtreeScaleResult = vi.fn<(result: ScaleTaskSubtreeResult) => void>();
    const { container } = render(
      <GanttChart
        tasks={tasks}
        dayWidth={DAY_WIDTH}
        rowHeight={36}
        headerHeight={36}
        businessDays={false}
        onTasksChange={onTasksChange}
        onSubtreeScaleResult={onSubtreeScaleResult}
      />
    );

    const parentBar = getBar(container, 'P');
    mockBarRect(parentBar, 10 * DAY_WIDTH);
    fireEvent.mouseDown(parentBar, { clientX: 10 * DAY_WIDTH - 5, clientY: 20, button: 0 });
    // Drag down to a single day: -9 days of pixels.
    fireEvent.mouseMove(window, { clientX: 10 * DAY_WIDTH - 5 - 9 * DAY_WIDTH, clientY: 20 });
    await waitFor(() => {
      expect(parentBar).toHaveClass('gantt-tr-dragging');
    });
    fireEvent.mouseUp(window, { clientX: 10 * DAY_WIDTH - 5 - 9 * DAY_WIDTH, clientY: 20 });

    await waitFor(() => {
      expect(onSubtreeScaleResult).toHaveBeenCalledTimes(1);
    });

    const scaleResult = onSubtreeScaleResult.mock.calls[0][0];
    expect(scaleResult.ok).toBe(true);
    if (scaleResult.ok) {
      expect(scaleResult.requestedDuration).toBe(1);
      expect(scaleResult.appliedDuration).toBe(2);
      expect(scaleResult.clamped).toBe(true);
      expect(scaleResult.warnings).toEqual([
        { code: 'TARGET_CLAMPED_TO_MINIMUM', requestedDuration: 1, minimumDuration: 2 },
      ]);
    }

    // The minimal admissible schedule is still applied (not the untouched snapshot).
    await waitFor(() => {
      expect(onTasksChange).toHaveBeenCalledTimes(1);
    });
    const batch = onTasksChange.mock.calls[0][0] as Task[];
    const parent = batch.find((t: Task) => t.id === 'P')!;
    expect(parent.startDate).toBe('2026-01-01');
    expect(parent.endDate).toBe('2026-01-02');
  });

  it('keeps the regular leaf resize behavior untouched', async () => {
    const onTasksChange = vi.fn();
    const onSubtreeScaleResult = vi.fn<(result: ScaleTaskSubtreeResult) => void>();
    const { container } = render(
      <GanttChart
        tasks={makeParentChain()}
        dayWidth={DAY_WIDTH}
        rowHeight={36}
        headerHeight={36}
        businessDays={false}
        onTasksChange={onTasksChange}
        onSubtreeScaleResult={onSubtreeScaleResult}
      />
    );

    const leafBar = getBar(container, 'A');
    mockBarRect(leafBar, 4 * DAY_WIDTH);
    fireEvent.mouseDown(leafBar, { clientX: 4 * DAY_WIDTH - 5, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 4 * DAY_WIDTH - 5 + 2 * DAY_WIDTH, clientY: 20 });
    await waitFor(() => {
      expect(leafBar).toHaveClass('gantt-tr-dragging');
    });
    fireEvent.mouseUp(window, { clientX: 4 * DAY_WIDTH - 5 + 2 * DAY_WIDTH, clientY: 20 });

    await waitFor(() => {
      expect(onTasksChange).toHaveBeenCalled();
    });

    // Leaf resize goes through the regular cascade path (universalCascade),
    // never through the subtree scaler.
    expect(onSubtreeScaleResult).not.toHaveBeenCalled();
    const batch = onTasksChange.mock.calls[0][0] as Task[];
    const leaf = batch.find((t: Task) => t.id === 'A');
    expect(leaf).toBeDefined();
    expect(new Date(leaf!.endDate).toISOString()).toBe('2026-01-06T00:00:00.000Z');
  });

  it('still moves a parent (uniform shift) without rescaling', async () => {
    const onTasksChange = vi.fn();
    const onSubtreeScaleResult = vi.fn<(result: ScaleTaskSubtreeResult) => void>();
    const { container } = render(
      <GanttChart
        tasks={makeParentChain()}
        dayWidth={DAY_WIDTH}
        rowHeight={36}
        headerHeight={36}
        businessDays={false}
        onTasksChange={onTasksChange}
        onSubtreeScaleResult={onSubtreeScaleResult}
      />
    );

    const parentBar = getBar(container, 'P');
    mockBarRect(parentBar, 20 * DAY_WIDTH);
    // Grab the middle of the bar — move mode, not resize.
    fireEvent.mouseDown(parentBar, { clientX: 10 * DAY_WIDTH, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 10 * DAY_WIDTH + 3 * DAY_WIDTH, clientY: 20 });
    await waitFor(() => {
      expect(parentBar).toHaveClass('gantt-tr-dragging');
    });
    fireEvent.mouseUp(window, { clientX: 10 * DAY_WIDTH + 3 * DAY_WIDTH, clientY: 20 });

    await waitFor(() => {
      expect(onTasksChange).toHaveBeenCalled();
    });

    // Uniform move: no scaling, children shifted by the same delta, durations intact.
    expect(onSubtreeScaleResult).not.toHaveBeenCalled();
    const batch = onTasksChange.mock.calls[0][0] as Task[];
    const byId = new Map(batch.map((t: Task) => [t.id, t]));
    expect(byId.get('P')!.startDate).toBe('2026-01-04');
    expect(byId.get('P')!.endDate).toBe('2026-01-23');
    expect(getTaskDuration(byId.get('A')!.startDate, byId.get('A')!.endDate)).toBe(4);
    expect(getTaskDuration(byId.get('B')!.startDate, byId.get('B')!.endDate)).toBe(6);
  });
});


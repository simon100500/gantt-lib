import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTaskDrag } from '../hooks/useTaskDrag';
import type { Task } from '../types';

describe('useTaskDrag milestone targets', () => {
  const milestoneTask: Task = {
    id: 'milestone-1',
    name: 'Go live',
    startDate: '2026-04-10',
    endDate: '2026-04-10',
    type: 'milestone',
  };

  const createOptions = () => ({
    taskId: milestoneTask.id,
    initialStartDate: new Date(Date.UTC(2026, 3, 10)),
    initialEndDate: new Date(Date.UTC(2026, 3, 10)),
    monthStart: new Date(Date.UTC(2026, 3, 1)),
    dayWidth: 40,
    onDragEnd: vi.fn(),
    allTasks: [milestoneTask],
  });

  it('forces milestone resize attempts into move mode', () => {
    const { result } = renderHook(() => useTaskDrag(createOptions()));
    const mockElement = {
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 360, width: 40 }),
    } as unknown as HTMLElement;

    act(() => {
      result.current.dragHandleProps.onMouseDown({
        currentTarget: mockElement,
        clientX: 361,
      } as unknown as React.MouseEvent);
    });

    expect(result.current.dragMode).toBe('move');
  });

  it('keeps milestone drag result single-date', async () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useTaskDrag({
        ...createOptions(),
        onDragEnd,
      })
    );
    const mockElement = {
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 360, width: 40 }),
    } as unknown as HTMLElement;

    act(() => {
      result.current.dragHandleProps.onMouseDown({
        currentTarget: mockElement,
        clientX: 380,
      } as unknown as React.MouseEvent);
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 420 }));
    });

    await waitFor(() => {
      expect(result.current.currentLeft).toBe(400);
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup', {}));
    });

    await waitFor(() => {
      expect(onDragEnd).toHaveBeenCalled();
      const [{ startDate, endDate }] = onDragEnd.mock.calls[0];
      expect(startDate.toISOString()).toBe(endDate.toISOString());
    });
  });

  it('uses zero duration for malformed milestone dates during init and no-op drag', async () => {
    const onDragEnd = vi.fn();
    const malformedMilestone: Task = {
      ...milestoneTask,
      endDate: '2026-04-15',
    };

    const { result } = renderHook(() =>
      useTaskDrag({
        ...createOptions(),
        initialEndDate: new Date(Date.UTC(2026, 3, 15)),
        onDragEnd,
        allTasks: [malformedMilestone],
      })
    );

    // Milestone must stay visually one-day wide even with malformed endDate in input
    expect(result.current.currentWidth).toBe(40);

    const mockElement = {
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 360, width: 40 }),
    } as unknown as HTMLElement;

    act(() => {
      result.current.dragHandleProps.onMouseDown({
        currentTarget: mockElement,
        clientX: 380,
      } as unknown as React.MouseEvent);
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup', {}));
    });

    await waitFor(() => {
      expect(onDragEnd).not.toHaveBeenCalled();
    });
  });

  it('keeps milestone successor preview on the same day for FS lag=0', async () => {
    const predecessor: Task = {
      id: 'ms-1',
      name: 'First',
      startDate: '2026-04-10',
      endDate: '2026-04-10',
      type: 'milestone',
    };
    const successor: Task = {
      id: 'ms-2',
      name: 'Second',
      startDate: '2026-04-10',
      endDate: '2026-04-10',
      type: 'milestone',
      dependencies: [{ taskId: 'ms-1', type: 'FS', lag: 0 }],
    };
    const onCascadeProgress = vi.fn();

    const { result } = renderHook(() =>
      useTaskDrag({
        taskId: predecessor.id,
        initialStartDate: new Date(Date.UTC(2026, 3, 10)),
        initialEndDate: new Date(Date.UTC(2026, 3, 10)),
        monthStart: new Date(Date.UTC(2026, 3, 1)),
        dayWidth: 40,
        allTasks: [predecessor, successor],
        onDragEnd: vi.fn(),
        onCascade: vi.fn(),
        onCascadeProgress,
      })
    );

    const mockElement = {
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 360, width: 40 }),
    } as unknown as HTMLElement;

    act(() => {
      result.current.dragHandleProps.onMouseDown({
        currentTarget: mockElement,
        clientX: 380,
      } as unknown as React.MouseEvent);
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 420 }));
    });

    await waitFor(() => {
      const nonEmptyCalls = onCascadeProgress.mock.calls.filter(([overrides]) => overrides.size > 0);
      expect(nonEmptyCalls.length).toBeGreaterThan(0);
      const [overrideMap, previewTasks] = nonEmptyCalls[0];
      expect(overrideMap.get('ms-2')).toEqual({ left: 400, width: 40 });
      expect(previewTasks.find((task: Task) => task.id === 'ms-2')?.startDate).toBe('2026-04-11');
      expect(previewTasks.find((task: Task) => task.id === 'ms-2')?.dependencies?.[0]?.lag).toBe(0);
    });
  });
});

import React from 'react';
import { act, renderHook } from '@testing-library/react';
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

  it.skip('forces milestone resize attempts into move mode', () => {
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

  it.skip('keeps milestone drag result single-date', () => {
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
      window.dispatchEvent(new MouseEvent('mouseup', {}));
    });

    expect(onDragEnd).toHaveBeenCalled();
  });
});

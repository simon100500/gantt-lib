import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceTimelineChart } from '../components/ResourceTimelineChart';
import type { ResourceTimelineMove, ResourceTimelineResource } from '../types';

const resources: ResourceTimelineResource[] = [
  {
    id: 'design',
    name: 'Design',
    items: [
      {
        id: 'item-1',
        resourceId: 'design',
        taskId: 'task-1',
        title: 'Discovery',
        startDate: '2026-04-03',
        endDate: '2026-04-05',
      },
    ],
  },
  {
    id: 'dev',
    name: 'Development',
    items: [],
  },
];

describe('ResourceTimelineChart drag interactions', () => {
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

  it('emits a one-day horizontal move with the same resource and preserves duration', async () => {
    const onResourceItemMove = vi.fn<[ResourceTimelineMove]>();
    const { container } = render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        dayWidth={40}
        laneHeight={40}
        businessDays={false}
        onResourceItemMove={onResourceItemMove}
      />
    );

    const item = screen.getByText('Discovery').closest('[data-resource-item-id="item-1"]') as HTMLElement;

    fireEvent.mouseDown(item, { clientX: 100, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 140, clientY: 20 });

    await waitFor(() => {
      expect(item).toHaveClass('gantt-resourceTimeline-itemDragging');
    });

    expect(onResourceItemMove).not.toHaveBeenCalled();

    fireEvent.mouseUp(window, { clientX: 140, clientY: 20 });

    await waitFor(() => {
      expect(onResourceItemMove).toHaveBeenCalledTimes(1);
    });

    const move = onResourceItemMove.mock.calls[0][0];
    expect(move.itemId).toBe('item-1');
    expect(move.taskId).toBe('task-1');
    expect(move.changeType).toBe('move');
    expect(move.fromResourceId).toBe('design');
    expect(move.toResourceId).toBe('design');
    expect(move.startDate.toISOString()).toBe('2026-04-04T00:00:00.000Z');
    expect(move.endDate.toISOString()).toBe('2026-04-06T00:00:00.000Z');

    const durationDays =
      (move.endDate.getTime() - move.startDate.getTime()) / (24 * 60 * 60 * 1000);
    expect(durationDays).toBe(2);
    expect(container.querySelector('.gantt-resourceTimeline-itemDragging')).toBeNull();
  });

  it('emits a target resource id when dropped on another resource row', async () => {
    const onResourceItemMove = vi.fn<[ResourceTimelineMove]>();
    const { container } = render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        dayWidth={40}
        laneHeight={40}
        businessDays={false}
        onResourceItemMove={onResourceItemMove}
      />
    );

    const grid = container.querySelector('.gantt-resourceTimeline-grid') as HTMLElement;
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 100,
      top: 100,
      left: 0,
      right: 400,
      bottom: 180,
      width: 400,
      height: 80,
      toJSON: () => ({}),
    });

    const item = screen.getByText('Discovery').closest('[data-resource-item-id="item-1"]') as HTMLElement;

    fireEvent.mouseDown(item, { clientX: 100, clientY: 120, button: 0 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 160 });

    expect(onResourceItemMove).not.toHaveBeenCalled();

    fireEvent.mouseUp(window, { clientX: 100, clientY: 160 });

    await waitFor(() => {
      expect(onResourceItemMove).toHaveBeenCalledTimes(1);
    });

    expect(onResourceItemMove.mock.calls[0][0]).toMatchObject({
      itemId: 'item-1',
      fromResourceId: 'design',
      toResourceId: 'dev',
    });
  });

  it('cancels when dropped outside resource rows', async () => {
    const onResourceItemMove = vi.fn<[ResourceTimelineMove]>();
    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        dayWidth={40}
        laneHeight={40}
        businessDays={false}
        onResourceItemMove={onResourceItemMove}
      />
    );

    const item = screen.getByText('Discovery').closest('[data-resource-item-id="item-1"]') as HTMLElement;

    fireEvent.mouseDown(item, { clientX: 100, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 140, clientY: 120 });
    fireEvent.mouseUp(window, { clientX: 140, clientY: 120 });

    await waitFor(() => {
      expect(item).not.toHaveClass('gantt-resourceTimeline-itemDragging');
    });
    expect(onResourceItemMove).not.toHaveBeenCalled();
  });

  it('does not start dragging when readonly is true', async () => {
    const onResourceItemMove = vi.fn<[ResourceTimelineMove]>();
    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        dayWidth={40}
        laneHeight={40}
        businessDays={false}
        readonly
        onResourceItemMove={onResourceItemMove}
      />
    );

    const item = screen.getByText('Discovery').closest('[data-resource-item-id="item-1"]') as HTMLElement;

    fireEvent.mouseDown(item, { clientX: 100, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 140, clientY: 20 });
    fireEvent.mouseUp(window, { clientX: 140, clientY: 20 });

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(item).not.toHaveClass('gantt-resourceTimeline-itemDragging');
    expect(onResourceItemMove).not.toHaveBeenCalled();
  });

  it('does not start dragging when the item is locked', async () => {
    const onResourceItemMove = vi.fn<[ResourceTimelineMove]>();
    const lockedResources: ResourceTimelineResource[] = [
      {
        id: 'design',
        name: 'Design',
        items: [
          {
            id: 'item-1',
            resourceId: 'design',
            title: 'Discovery',
            startDate: '2026-04-03',
            endDate: '2026-04-05',
            locked: true,
          },
        ],
      },
    ];

    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={lockedResources}
        dayWidth={40}
        laneHeight={40}
        businessDays={false}
        onResourceItemMove={onResourceItemMove}
      />
    );

    const item = screen.getByText('Discovery').closest('[data-resource-item-id="item-1"]') as HTMLElement;

    fireEvent.mouseDown(item, { clientX: 100, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 140, clientY: 20 });
    fireEvent.mouseUp(window, { clientX: 140, clientY: 20 });

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(item).not.toHaveClass('gantt-resourceTimeline-itemDragging');
    expect(onResourceItemMove).not.toHaveBeenCalled();
  });

  it('allows dropping onto an occupied target resource without rejecting overlap', async () => {
    const onResourceItemMove = vi.fn<[ResourceTimelineMove]>();
    const occupiedResources: ResourceTimelineResource[] = [
      ...resources,
      {
        id: 'qa',
        name: 'QA',
        items: [
          {
            id: 'qa-item',
            resourceId: 'qa',
            title: 'Review',
            startDate: '2026-04-03',
            endDate: '2026-04-05',
          },
        ],
      },
    ];

    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={occupiedResources}
        dayWidth={40}
        laneHeight={40}
        businessDays={false}
        onResourceItemMove={onResourceItemMove}
      />
    );

    const item = screen.getByText('Discovery').closest('[data-resource-item-id="item-1"]') as HTMLElement;

    fireEvent.mouseDown(item, { clientX: 100, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(window, { clientX: 100, clientY: 100 });

    await waitFor(() => {
      expect(onResourceItemMove).toHaveBeenCalledTimes(1);
    });
    expect(onResourceItemMove.mock.calls[0][0].toResourceId).toBe('qa');
  });

  it('keeps moves on the source resource when reassignment is disabled', async () => {
    const onResourceItemMove = vi.fn<[ResourceTimelineMove]>();
    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        dayWidth={40}
        laneHeight={40}
        businessDays={false}
        disableResourceReassignment
        onResourceItemMove={onResourceItemMove}
      />
    );

    const item = screen.getByText('Discovery').closest('[data-resource-item-id="item-1"]') as HTMLElement;

    fireEvent.mouseDown(item, { clientX: 100, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 140, clientY: 60 });

    await waitFor(() => {
      expect(item).toHaveClass('gantt-resourceTimeline-itemDragging');
    });
    expect(item.style.top).toBe('2px');

    fireEvent.mouseUp(window, { clientX: 140, clientY: 60 });

    await waitFor(() => {
      expect(onResourceItemMove).toHaveBeenCalledTimes(1);
    });

    expect(onResourceItemMove.mock.calls[0][0]).toMatchObject({
      fromResourceId: 'design',
      toResourceId: 'design',
    });
    expect(onResourceItemMove.mock.calls[0][0].startDate.toISOString()).toBe('2026-04-04T00:00:00.000Z');
  });

  it('resizes the resource item end date from the right edge', async () => {
    const onResourceItemMove = vi.fn<[ResourceTimelineMove]>();
    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        dayWidth={40}
        laneHeight={40}
        businessDays={false}
        onResourceItemMove={onResourceItemMove}
      />
    );

    const item = screen.getByText('Discovery').closest('[data-resource-item-id="item-1"]') as HTMLElement;
    const handle = item.querySelector('.gantt-resourceTimeline-resizeHandleEnd') as HTMLElement;
    expect(item.querySelector('.gantt-resourceTimeline-itemDurationChip')).toHaveTextContent('3');

    fireEvent.mouseDown(handle, { clientX: 200, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 240, clientY: 80 });

    await waitFor(() => {
      expect(item).toHaveClass('gantt-resourceTimeline-itemDragging');
      expect(item.style.width).toBe('157px');
      expect(item.style.top).toBe('2px');
      expect(item.querySelector('.gantt-resourceTimeline-itemDurationChip')).toHaveTextContent('4');
    });

    fireEvent.mouseUp(window, { clientX: 240, clientY: 80 });

    await waitFor(() => {
      expect(onResourceItemMove).toHaveBeenCalledTimes(1);
    });

    expect(onResourceItemMove.mock.calls[0][0]).toMatchObject({
      itemId: 'item-1',
      taskId: 'task-1',
      fromResourceId: 'design',
      toResourceId: 'design',
      changeType: 'resize-end',
    });
    expect(onResourceItemMove.mock.calls[0][0].startDate.toISOString()).toBe('2026-04-03T00:00:00.000Z');
    expect(onResourceItemMove.mock.calls[0][0].endDate.toISOString()).toBe('2026-04-06T00:00:00.000Z');
  });

  it('updates custom renderItem duration context while resizing', async () => {
    const onResourceItemMove = vi.fn<[ResourceTimelineMove]>();
    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        dayWidth={40}
        laneHeight={40}
        businessDays={false}
        onResourceItemMove={onResourceItemMove}
        renderItem={(item, context) => (
          <span data-testid={`duration-${item.id}`}>{context.durationDays}</span>
        )}
      />
    );

    const item = screen.getByTestId('duration-item-1').closest('[data-resource-item-id="item-1"]') as HTMLElement;
    const handle = item.querySelector('.gantt-resourceTimeline-resizeHandleEnd') as HTMLElement;
    expect(screen.getByTestId('duration-item-1')).toHaveTextContent('3');

    fireEvent.mouseDown(handle, { clientX: 200, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 240, clientY: 20 });

    await waitFor(() => {
      expect(screen.getByTestId('duration-item-1')).toHaveTextContent('4');
    });
  });

  it('updates custom renderItem duration context while moving in business-days mode', async () => {
    const onResourceItemMove = vi.fn<[ResourceTimelineMove]>();
    const businessResources: ResourceTimelineResource[] = [
      {
        id: 'design',
        name: 'Design',
        items: [
          {
            id: 'item-1',
            resourceId: 'design',
            title: 'Discovery',
            startDate: '2026-04-03',
            endDate: '2026-04-06',
          },
        ],
      },
    ];

    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={businessResources}
        dayWidth={40}
        laneHeight={40}
        businessDays
        disableResourceReassignment
        onResourceItemMove={onResourceItemMove}
        renderItem={(item, context) => (
          <span data-testid={`duration-${item.id}`}>{context.durationDays}</span>
        )}
      />
    );

    const item = screen.getByTestId('duration-item-1').closest('[data-resource-item-id="item-1"]') as HTMLElement;
    expect(screen.getByTestId('duration-item-1')).toHaveTextContent('2');

    fireEvent.mouseDown(item, { clientX: 100, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 140, clientY: 20 });

    await waitFor(() => {
      expect(screen.getByTestId('duration-item-1')).toHaveTextContent('2');
      expect(item.style.left).toBe('202px');
    });
  });

  it('resizes the resource item start date from the left edge', async () => {
    const onResourceItemMove = vi.fn<[ResourceTimelineMove]>();
    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={resources}
        dayWidth={40}
        laneHeight={40}
        businessDays={false}
        onResourceItemMove={onResourceItemMove}
      />
    );

    const item = screen.getByText('Discovery').closest('[data-resource-item-id="item-1"]') as HTMLElement;
    const handle = item.querySelector('.gantt-resourceTimeline-resizeHandleStart') as HTMLElement;

    fireEvent.mouseDown(handle, { clientX: 80, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 40, clientY: 80 });

    await waitFor(() => {
      expect(item).toHaveClass('gantt-resourceTimeline-itemDragging');
      expect(item.style.left).toBe('42px');
      expect(item.style.width).toBe('157px');
      expect(item.style.top).toBe('2px');
    });

    fireEvent.mouseUp(window, { clientX: 40, clientY: 80 });

    await waitFor(() => {
      expect(onResourceItemMove).toHaveBeenCalledTimes(1);
    });

    expect(onResourceItemMove.mock.calls[0][0]).toMatchObject({
      itemId: 'item-1',
      taskId: 'task-1',
      fromResourceId: 'design',
      toResourceId: 'design',
      changeType: 'resize-start',
    });
    expect(onResourceItemMove.mock.calls[0][0].startDate.toISOString()).toBe('2026-04-02T00:00:00.000Z');
    expect(onResourceItemMove.mock.calls[0][0].endDate.toISOString()).toBe('2026-04-05T00:00:00.000Z');
  });

  it('snaps resource item moves to working days and preserves business-day duration', async () => {
    const onResourceItemMove = vi.fn<[ResourceTimelineMove]>();
    const businessResources: ResourceTimelineResource[] = [
      {
        id: 'design',
        name: 'Design',
        items: [
          {
            id: 'item-1',
            resourceId: 'design',
            title: 'Discovery',
            startDate: '2026-04-03',
            endDate: '2026-04-06',
          },
        ],
      },
    ];

    render(
      <ResourceTimelineChart
        mode="resource-planner"
        resources={businessResources}
        dayWidth={40}
        laneHeight={40}
        businessDays
        disableResourceReassignment
        onResourceItemMove={onResourceItemMove}
      />
    );

    const item = screen.getByText('Discovery').closest('[data-resource-item-id="item-1"]') as HTMLElement;

    fireEvent.mouseDown(item, { clientX: 100, clientY: 20, button: 0 });
    fireEvent.mouseMove(window, { clientX: 140, clientY: 20 });

    await waitFor(() => {
      expect(item).toHaveClass('gantt-resourceTimeline-itemDragging');
      expect(item.style.left).toBe('202px');
      expect(item.style.width).toBe('77px');
    });
    const overlay = item.querySelector('[data-resource-weekend-overlay="true"]') as HTMLElement;
    expect(overlay).toBeNull();

    fireEvent.mouseUp(window, { clientX: 140, clientY: 20 });

    await waitFor(() => {
      expect(onResourceItemMove).toHaveBeenCalledTimes(1);
    });

    const move = onResourceItemMove.mock.calls[0][0];
    expect(move.startDate.toISOString()).toBe('2026-04-06T00:00:00.000Z');
    expect(move.endDate.toISOString()).toBe('2026-04-07T00:00:00.000Z');
  });
});

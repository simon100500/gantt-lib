import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GanttChart, type ResourceTimelineResource, type Task } from '../components/GanttChart';

const tasks: Task[] = [
  {
    id: 'task-1',
    name: 'Task mode remains default',
    startDate: '2026-04-01',
    endDate: '2026-04-03',
  },
];

const resources: ResourceTimelineResource[] = [
  {
    id: 'resource-1',
    name: 'Resource Alpha',
    items: [
      {
        id: 'item-1',
        resourceId: 'resource-1',
        title: 'Assignment Alpha',
        startDate: '2026-04-01',
        endDate: '2026-04-03',
      },
    ],
  },
];

describe('GanttChart mode boundary', () => {
  it('keeps omitted mode compatible with current task-mode props', () => {
    render(<GanttChart tasks={tasks} />);

    expect(screen.getAllByText('Task mode remains default').length).toBeGreaterThan(0);
  });

  it('supports explicit gantt mode with current task-mode props', () => {
    render(<GanttChart mode="gantt" tasks={tasks} />);

    expect(screen.getAllByText('Task mode remains default').length).toBeGreaterThan(0);
  });

  it('accepts resource planner mode without requiring task props', () => {
    const { container } = render(
      <GanttChart mode="resource-planner" resources={resources} />
    );

    expect(container.querySelector('.gantt-resourceTimeline')).toBeTruthy();
    expect(container.querySelector('.gantt-tl-overlay')).toBeNull();
    expect(container.querySelector('.gantt-dependencyLines')).toBeNull();
  });
});

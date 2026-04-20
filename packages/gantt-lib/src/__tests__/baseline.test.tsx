import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GanttChart, type Task } from '../components/GanttChart';
import TaskRow from '../components/TaskRow';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('baseline rendering', () => {
  const taskWithBaseline: Task = {
    id: 'task-1',
    name: 'Task 1',
    startDate: '2026-02-04',
    endDate: '2026-02-06',
    baselineStartDate: '2026-02-02',
    baselineEndDate: '2026-02-05',
  };

  it('does not render baseline when showBaseline is false', () => {
    const { container } = render(
      <TaskRow
        task={taskWithBaseline}
        monthStart={new Date(Date.UTC(2026, 1, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[taskWithBaseline]}
        onTasksChange={vi.fn()}
        showBaseline={false}
      />
    );

    expect(container.querySelector('.gantt-tr-baseline')).toBeNull();
  });

  it('renders baseline when showBaseline is true and both dates exist', () => {
    const { container } = render(
      <TaskRow
        task={taskWithBaseline}
        monthStart={new Date(Date.UTC(2026, 1, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[taskWithBaseline]}
        onTasksChange={vi.fn()}
        showBaseline
      />
    );

    const baseline = container.querySelector('.gantt-tr-baseline') as HTMLElement | null;
    expect(baseline).not.toBeNull();
    expect(baseline?.style.left).toBe('40px');
    expect(baseline?.style.width).toBe('160px');
  });

  it('does not render baseline with incomplete baseline dates', () => {
    const taskWithoutEnd: Task = {
      ...taskWithBaseline,
      baselineEndDate: undefined,
    };

    const { container } = render(
      <TaskRow
        task={taskWithoutEnd}
        monthStart={new Date(Date.UTC(2026, 1, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[taskWithoutEnd]}
        onTasksChange={vi.fn()}
        showBaseline
      />
    );

    expect(container.querySelector('.gantt-tr-baseline')).toBeNull();
  });

  it('does not render milestone baseline in v1', () => {
    const milestone: Task = {
      ...taskWithBaseline,
      id: 'm1',
      type: 'milestone',
      startDate: '2026-02-06',
      endDate: '2026-02-06',
    };

    const { container } = render(
      <TaskRow
        task={milestone}
        monthStart={new Date(Date.UTC(2026, 1, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[milestone]}
        onTasksChange={vi.fn()}
        showBaseline
      />
    );

    expect(container.querySelector('.gantt-tr-baseline')).toBeNull();
  });

  it('renders parent baseline with parent-specific class', () => {
    const parent: Task = {
      ...taskWithBaseline,
      id: 'parent-1',
      name: 'Parent',
    };
    const child: Task = {
      id: 'child-1',
      name: 'Child',
      startDate: '2026-02-04',
      endDate: '2026-02-05',
      parentId: 'parent-1',
    };

    const { container } = render(
      <TaskRow
        task={parent}
        monthStart={new Date(Date.UTC(2026, 1, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[parent, child]}
        onTasksChange={vi.fn()}
        showBaseline
      />
    );

    const baseline = container.querySelector('.gantt-tr-baseline-parent');
    expect(baseline).not.toBeNull();
  });

  it('renders no baseline elements in chart when showBaseline is false', () => {
    const { container } = render(
      <GanttChart
        tasks={[taskWithBaseline]}
        showBaseline={false}
      />
    );

    expect(container.querySelector('.gantt-tr-baseline')).toBeNull();
  });

  it('renders baseline elements in chart when showBaseline is true', () => {
    const { container } = render(
      <GanttChart
        tasks={[taskWithBaseline]}
        showBaseline
      />
    );

    expect(container.querySelector('.gantt-tr-baseline')).not.toBeNull();
  });
});

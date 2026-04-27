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

describe('GanttChart showChart', () => {
  const tasks: Task[] = [
    {
      id: 'task-1',
      name: 'Task 1',
      startDate: '2026-02-01',
      endDate: '2026-02-03',
    },
  ];

  it('keeps task list and calendar header layout heights identical', () => {
    const { container } = render(
      <GanttChart
        tasks={tasks}
        showTaskList
        headerHeight={40}
      />
    );

    const taskListHeader = container.querySelector('.gantt-tl-header') as HTMLElement;
    const stickyHeader = container.querySelector('.gantt-stickyHeader') as HTMLElement;

    expect(taskListHeader.style.height).toBe('41px');
    expect(stickyHeader.style.height).toBe('41px');
  });

  it('hides the chart surface when showChart is false', () => {
    const { container } = render(
      <GanttChart
        tasks={tasks}
        showTaskList
        showChart={false}
      />
    );

    const chartSurface = container.querySelector('.gantt-chartSurface') as HTMLDivElement | null;
    expect(chartSurface).not.toBeNull();
    expect(chartSurface?.classList.contains('gantt-chart-hidden')).toBe(true);
    expect(getComputedStyle(chartSurface as HTMLDivElement).display).toBe('none');
  });
});

import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
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

  it('hydrates vh-height virtualized task lists without row-count mismatch', async () => {
    const manyTasks: Task[] = Array.from({ length: 60 }, (_, index) => ({
      id: `task-${index + 1}`,
      name: `Task ${index + 1}`,
      startDate: '2026-02-01',
      endDate: '2026-02-03',
    }));
    const element = (
      <GanttChart
        tasks={manyTasks}
        showTaskList
        containerHeight="80dvh"
        rowHeight={36}
      />
    );
    const originalWindow = globalThis.window;

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: undefined,
    });
    const serverHtml = renderToString(element);
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });

    const container = document.createElement('div');
    container.innerHTML = serverHtml;
    document.body.appendChild(container);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const root = hydrateRoot(container, element);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      consoleErrorSpy.mock.calls.some((call) => String(call[0]).includes('Hydration failed'))
    ).toBe(false);

    root.unmount();
    consoleErrorSpy.mockRestore();
    container.remove();
  });
});

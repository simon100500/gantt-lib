import React, { createRef } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GanttChart, type GanttChartHandle, type Task } from '../components/GanttChart';
import { withoutDeps } from '../filters';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('GanttChart taskFilter', () => {
  it('highlights matching task list and chart rows without hiding other tasks', () => {
    const tasks: Task[] = [
      {
        id: 'a',
        name: 'No deps',
        startDate: '2026-02-01',
        endDate: '2026-02-03',
        progress: 0,
      },
      {
        id: 'b',
        name: 'Has deps',
        startDate: '2026-02-04',
        endDate: '2026-02-06',
        progress: 0,
        dependencies: [{ taskId: 'a', type: 'FS', lag: 0 }],
      },
    ];

    render(
      <GanttChart
        tasks={tasks}
        showTaskList
        taskFilter={withoutDeps()}
        rowHeight={36}
        headerHeight={36}
      />
    );

    expect(screen.getAllByText('No deps').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Has deps').length).toBeGreaterThan(0);

    const highlightedRows = Array.from(
      document.querySelectorAll('[data-filter-match="true"]')
    );
    const plainRows = Array.from(
      document.querySelectorAll('[data-filter-match="false"]')
    );

    expect(highlightedRows.length).toBeGreaterThan(0);
    expect(plainRows.length).toBeGreaterThan(0);
  });

  it('forwards external highlightedTaskIds to task list rows', () => {
    const tasks: Task[] = [
      {
        id: 'a',
        name: 'Alpha task',
        startDate: '2026-02-01',
        endDate: '2026-02-03',
      },
      {
        id: 'b',
        name: 'Beta task',
        startDate: '2026-02-04',
        endDate: '2026-02-06',
      },
    ];

    const { container } = render(
      <GanttChart
        tasks={tasks}
        showTaskList
        highlightedTaskIds={new Set(['b'])}
        rowHeight={36}
        headerHeight={40}
      />
    );

    const highlightedTaskListRows = container.querySelectorAll('.gantt-tl-row[data-filter-match="true"]');
    expect(highlightedTaskListRows).toHaveLength(1);
    expect(within(highlightedTaskListRows[0] as HTMLElement).getByText('Beta task')).toBeTruthy();
  });

  it('scrollToRow scrolls the vertical container to the matching task list row', () => {
    const tasks: Task[] = [
      {
        id: 'a',
        name: 'Alpha task',
        startDate: '2026-02-01',
        endDate: '2026-02-03',
      },
      {
        id: 'b',
        name: 'Beta task',
        startDate: '2026-02-04',
        endDate: '2026-02-06',
      },
      {
        id: 'c',
        name: 'Gamma task',
        startDate: '2026-02-07',
        endDate: '2026-02-09',
      },
      {
        id: 'd',
        name: 'Delta task',
        startDate: '2026-02-10',
        endDate: '2026-02-12',
      },
    ];

    const ref = createRef<GanttChartHandle>();
    const { container } = render(
      <GanttChart
        ref={ref}
        tasks={tasks}
        showTaskList
        rowHeight={36}
        headerHeight={40}
      />
    );

    const scrollContainer = container.querySelector('.gantt-scrollContainer') as HTMLDivElement;
    const scrollToSpy = vi.fn();
    scrollContainer.scrollTo = scrollToSpy;

    act(() => {
      ref.current?.scrollToRow('d');
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 36, behavior: 'smooth' });
  });

  it('exposes exportToPdf on the public handle and opens the browser print flow', async () => {
    const tasks: Task[] = [
      {
        id: 'a',
        name: 'Alpha task',
        startDate: '2026-02-01',
        endDate: '2026-02-03',
      },
    ];

    const ref = createRef<GanttChartHandle>();
    const frameWindow = {
      document: document.implementation.createHTMLDocument('print'),
      print: vi.fn(),
      focus: vi.fn(),
      close: vi.fn(),
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
      setTimeout: ((callback: TimerHandler) => {
        if (typeof callback === 'function') {
          callback();
        }
        return 1;
      }) as Window['setTimeout'],
    } as unknown as Window;

    const appendChildOriginal = document.body.appendChild.bind(document.body);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
      if (node instanceof HTMLIFrameElement) {
        Object.defineProperty(node, 'contentWindow', {
          configurable: true,
          value: frameWindow,
        });
        Object.defineProperty(node, 'contentDocument', {
          configurable: true,
          value: frameWindow.document,
        });
      }
      return appendChildOriginal(node);
    });

    render(
      <GanttChart
        ref={ref}
        tasks={tasks}
        showTaskList
        rowHeight={36}
        headerHeight={40}
      />
    );

    expect(ref.current?.exportToPdf).toBeTypeOf('function');

    await act(async () => {
      await ref.current?.exportToPdf({
        title: 'Project Plan',
        fileName: 'project-plan.pdf',
      });
    });

    expect(appendChildSpy).toHaveBeenCalled();
    expect(frameWindow.focus).toHaveBeenCalled();
    expect(frameWindow.print).toHaveBeenCalled();
    expect(frameWindow.document.title).toBe('Project Plan');
  });
});

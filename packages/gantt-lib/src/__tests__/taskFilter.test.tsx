import React, { createRef } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

function createMockPrintWindow(): Window {
  const printDocument = document.implementation.createHTMLDocument('print');
  printDocument.open = vi.fn(() => printDocument) as Document['open'];
  printDocument.write = vi.fn();
  printDocument.close = vi.fn();

  return {
    document: printDocument,
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
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GanttChart taskFilter', () => {
  it('withoutDeps can match only child leaf tasks', () => {
    const rootWithoutDeps: Task = {
      id: 'root',
      name: 'Root without deps',
      startDate: '2026-02-01',
      endDate: '2026-02-03',
    };
    const childWithoutDeps: Task = {
      id: 'child',
      name: 'Child without deps',
      startDate: '2026-02-01',
      endDate: '2026-02-03',
      parentId: 'root',
    };
    const nestedParentWithoutDeps: Task = {
      id: 'nested-parent',
      name: 'Nested parent without deps',
      startDate: '2026-02-01',
      endDate: '2026-02-03',
      parentId: 'root',
    };
    const grandchildWithoutDeps: Task = {
      id: 'grandchild',
      name: 'Grandchild without deps',
      startDate: '2026-02-01',
      endDate: '2026-02-03',
      parentId: 'nested-parent',
    };
    const milestoneWithoutDeps: Task = {
      id: 'milestone',
      name: 'Milestone without deps',
      startDate: '2026-02-01',
      endDate: '2026-02-01',
      parentId: 'root',
      type: 'milestone',
    };
    const childWithDeps: Task = {
      id: 'child-linked',
      name: 'Child with deps',
      startDate: '2026-02-04',
      endDate: '2026-02-06',
      parentId: 'root',
      dependencies: [{ taskId: 'child', type: 'FS', lag: 0 }],
    };
    const tasks = [
      rootWithoutDeps,
      childWithoutDeps,
      nestedParentWithoutDeps,
      grandchildWithoutDeps,
      milestoneWithoutDeps,
      childWithDeps,
    ];
    const filter = withoutDeps({ onlyChildren: true, onlyLeafTasks: true, tasks });

    expect(filter(rootWithoutDeps)).toBe(false);
    expect(filter(childWithoutDeps)).toBe(true);
    expect(filter(nestedParentWithoutDeps)).toBe(false);
    expect(filter(grandchildWithoutDeps)).toBe(true);
    expect(filter(milestoneWithoutDeps)).toBe(false);
    expect(filter(childWithDeps)).toBe(false);
  });

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
    const frameWindow = createMockPrintWindow();

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
    expect(frameWindow.document.title).toBe('project-plan.pdf');
    const printStyles = Array.from(frameWindow.document.head.querySelectorAll('style'))
      .map(node => node.textContent ?? '')
      .join('\n');
    expect(printStyles).not.toContain('size: landscape;');
    expect(printStyles).not.toContain('size: portrait;');
  });

  it('uses documentTitle for printWindow.document.title without changing the visual header', async () => {
    const tasks: Task[] = [
      {
        id: 'a',
        name: 'Alpha task',
        startDate: '2026-02-01',
        endDate: '2026-02-03',
      },
    ];

    const ref = createRef<GanttChartHandle>();
    const frameWindow = createMockPrintWindow();

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

    await act(async () => {
      await ref.current?.exportToPdf({
        documentTitle: 'GetGantt - Проект A - 2026-04-15 14-30.pdf',
        fileName: 'GetGantt - Проект A - 2026-04-15 14-30.pdf',
        title: 'Проект A',
        header: {
          serviceName: 'GetGantt.ru',
          projectName: 'Проект A',
          exportDate: new Date('2026-04-15T14:30:00Z'),
        },
      });
    });

    expect(appendChildSpy).toHaveBeenCalled();
    expect(frameWindow.document.title).toBe('GetGantt - Проект A - 2026-04-15 14-30.pdf');
    expect(frameWindow.document.body.textContent).toContain('GetGantt.ru');
    expect(frameWindow.document.body.textContent).toContain('Проект A');
  });
});

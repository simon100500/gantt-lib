import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import TaskRow from '../components/TaskRow';
import type { Task } from '../components/GanttChart';

let originalDate: DateConstructor;
beforeEach(() => {
  originalDate = global.Date;
  const mockToday = new Date(Date.UTC(2026, 1, 15, 12, 0, 0));
  // @ts-expect-error test Date mock
  global.Date = class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) super(mockToday);
      // @ts-expect-error pass-through
      else super(...args);
    }
    static now() {
      return mockToday.getTime();
    }
  };
});
afterEach(() => {
  global.Date = originalDate;
});

function makeTask(partial: Partial<Task> & { id: string; startDate: string; endDate: string }): Task {
  return { name: partial.id, ...partial } as Task;
}

function getBar(container: HTMLElement) {
  return container.querySelector('[data-taskbar]') as HTMLElement;
}

describe('TaskRow critical path bar color', () => {
  it('paints the bar with the critical path color when isCritical is true', () => {
    const task = makeTask({ id: 'A', startDate: '2026-02-02', endDate: '2026-02-04' });
    const { container } = render(
      <TaskRow
        task={task}
        monthStart={new Date(Date.UTC(2026, 1, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[task]}
        onTasksChange={vi.fn()}
        isCritical
      />
    );
    expect(getBar(container).style.backgroundColor).toBe('var(--gantt-critical-path-color, #dc2626)');
  });

  it('keeps task.color when isCritical is false', () => {
    const task = makeTask({ id: 'A', startDate: '2026-02-02', endDate: '2026-02-04', color: '#123456' });
    const { container } = render(
      <TaskRow
        task={task}
        monthStart={new Date(Date.UTC(2026, 1, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[task]}
        onTasksChange={vi.fn()}
        isCritical={false}
      />
    );
    // jsdom normalizes the hex #123456 to rgb(18, 52, 86)
    expect(getBar(container).style.backgroundColor).toBe('rgb(18, 52, 86)');
  });

  it('prioritizes expired over critical', () => {
    const task = makeTask({ id: 'E', startDate: '2026-01-05', endDate: '2026-01-09', progress: 0 });
    const { container } = render(
      <TaskRow
        task={task}
        monthStart={new Date(Date.UTC(2026, 0, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[task]}
        onTasksChange={vi.fn()}
        isCritical
        highlightExpiredTasks
      />
    );
    expect(getBar(container).style.backgroundColor).toBe('var(--gantt-expired-color)');
  });

  it('adds the critical color to a parent bar', () => {
    const parent = makeTask({ id: 'P', startDate: '2026-02-02', endDate: '2026-02-08' });
    const child = makeTask({ id: 'A', startDate: '2026-02-02', endDate: '2026-02-04', parentId: 'P' });
    const { container } = render(
      <TaskRow
        task={parent}
        monthStart={new Date(Date.UTC(2026, 1, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[parent, child]}
        onTasksChange={vi.fn()}
        isCritical
      />
    );
    expect(getBar(container).style.getPropertyValue('--gantt-parent-bar-color')).toBe('var(--gantt-critical-path-color, #dc2626)');
  });
});

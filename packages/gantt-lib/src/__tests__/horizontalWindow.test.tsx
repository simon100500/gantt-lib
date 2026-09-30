import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GridBackground from '../components/GridBackground/GridBackground';
import TaskRow from '../components/TaskRow';
import type { Task } from '../components/GanttChart';

const days = (count: number): Date[] =>
  Array.from({ length: count }, (_, index) => new Date(Date.UTC(2026, 2, 1 + index)));

describe('horizontal window rendering (pan optimization)', () => {
  it('GridBackground skips grid lines outside the visible window', () => {
    const all = render(
      <GridBackground dateRange={days(30)} dayWidth={20} totalHeight={400} />
    );
    const allLines = all.container.querySelectorAll('.gantt-gb-gridLine').length;

    const windowed = render(
      <GridBackground
        dateRange={days(30)}
        dayWidth={20}
        totalHeight={400}
        horizontalWindow={{ startPx: 0, endPx: 100 }}
      />
    );
    const visibleLines = windowed.container.querySelectorAll('.gantt-gb-gridLine').length;

    expect(allLines).toBeGreaterThan(20);
    expect(visibleLines).toBeGreaterThan(0);
    expect(visibleLines).toBeLessThan(allLines);
  });

  it('TaskRow renders only activity bars inside the window', () => {
    const task: Task = {
      id: 'floor-1',
      name: 'Этаж 1',
      startDate: '2026-03-01',
      endDate: '2026-05-02',
      activities: [
        { id: 'a', name: 'A', startDate: '2026-03-01', endDate: '2026-03-02' },
        { id: 'b', name: 'B', startDate: '2026-04-01', endDate: '2026-04-02' },
        { id: 'c', name: 'C', startDate: '2026-05-01', endDate: '2026-05-02' },
      ],
    };
    const monthStart = new Date(Date.UTC(2026, 2, 1));

    const full = render(
      <TaskRow task={task} monthStart={monthStart} dayWidth={40} rowHeight={40} allTasks={[task]} onTasksChange={vi.fn()} />
    );
    expect(full.container.querySelectorAll('.gantt-tr-activityBar')).toHaveLength(3);

    const windowed = render(
      <TaskRow
        task={task}
        monthStart={monthStart}
        dayWidth={40}
        rowHeight={40}
        allTasks={[task]}
        onTasksChange={vi.fn()}
        horizontalWindow={{ startPx: 0, endPx: 200 }}
      />
    );
    const bars = windowed.container.querySelectorAll('.gantt-tr-activityBar');
    expect(bars).toHaveLength(1);
    expect(bars[0].getAttribute('data-activity-id')).toBe('a');
  });
});

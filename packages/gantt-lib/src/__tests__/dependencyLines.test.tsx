import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DependencyLines } from '../components/DependencyLines';
import type { Task } from '../components/GanttChart';

const isWeekend = (date: Date) => date.getUTCDay() === 0 || date.getUTCDay() === 6;

describe('DependencyLines', () => {
  it('renders lag labels in business days when enabled', () => {
    const tasks: Task[] = [
      {
        id: 'pred',
        name: 'Pred',
        startDate: '2026-03-03',
        endDate: '2026-03-09',
        progress: 0,
      },
      {
        id: 'succ',
        name: 'Succ',
        startDate: '2026-03-12',
        endDate: '2026-03-18',
        progress: 0,
        dependencies: [{ taskId: 'pred', type: 'FF', lag: 7 }],
      },
    ];

    render(
      <DependencyLines
        tasks={tasks}
        allTasks={tasks}
        monthStart={new Date('2026-03-01T00:00:00.000Z')}
        dayWidth={40}
        rowHeight={40}
        gridWidth={1240}
        businessDays={true}
        weekendPredicate={isWeekend}
      />
    );

    expect(screen.getByText('+7')).toBeTruthy();
  });

  it('reports the exact dependency when its line is clicked', () => {
    const onDependencyClick = vi.fn();
    const tasks: Task[] = [
      { id: 'pred-task', name: 'Pred', startDate: '2026-03-03', endDate: '2026-03-04' },
      {
        id: 'succ-task',
        name: 'Succ',
        startDate: '2026-03-05',
        endDate: '2026-03-06',
        dependencies: [{ taskId: 'pred-task', type: 'FS', lag: 0 }],
      },
    ];

    const { container } = render(
      <DependencyLines
        tasks={tasks}
        allTasks={tasks}
        monthStart={new Date('2026-03-01T00:00:00.000Z')}
        dayWidth={40}
        rowHeight={40}
        gridWidth={1240}
        onDependencyClick={onDependencyClick}
      />
    );

    fireEvent.click(container.querySelector('.gantt-dependency-hit-area')!);

    expect(onDependencyClick).toHaveBeenCalledWith(expect.objectContaining({
      predecessorId: 'pred-task',
      successorId: 'succ-task',
      linkType: 'FS',
    }));
  });

  it('highlights the selected dependency without adding an outline', () => {
    const tasks: Task[] = [
      { id: 'pred-task', name: 'Pred', startDate: '2026-03-03', endDate: '2026-03-04' },
      {
        id: 'succ-task',
        name: 'Succ',
        startDate: '2026-03-05',
        endDate: '2026-03-06',
        dependencies: [{ taskId: 'pred-task', type: 'FS', lag: 0 }],
      },
    ];

    const { container } = render(
      <DependencyLines
        tasks={tasks}
        allTasks={tasks}
        monthStart={new Date('2026-03-01T00:00:00.000Z')}
        dayWidth={40}
        rowHeight={40}
        gridWidth={1240}
        selectedDep={{ predecessorId: 'pred-task', successorId: 'succ-task', linkType: 'FS' }}
      />
    );

    expect(container.querySelectorAll('.gantt-dependency-selected')).toHaveLength(1);
    expect(container.querySelectorAll('.gantt-dependency-selected-outline')).toHaveLength(0);
  });
});

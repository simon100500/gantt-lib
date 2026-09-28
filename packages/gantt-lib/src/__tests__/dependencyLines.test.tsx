import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DependencyLines } from '../components/DependencyLines';
import type { Task } from '../components/GanttChart';

const isWeekend = (date: Date) => date.getUTCDay() === 0 || date.getUTCDay() === 6;

describe('DependencyLines', () => {
  it('draws a dashed link between children of two collapsed composite works', () => {
    const allTasks: Task[] = [
      { id: 'work-a', name: 'Work A', composite: true, startDate: '2026-03-01', endDate: '2026-03-04' },
      { id: 'floor-a', parentId: 'work-a', name: 'Floor A', startDate: '2026-03-02', endDate: '2026-03-03' },
      { id: 'work-b', name: 'Work B', composite: true, startDate: '2026-03-05', endDate: '2026-03-08' },
      { id: 'floor-b', parentId: 'work-b', name: 'Floor B', startDate: '2026-03-06', endDate: '2026-03-07', dependencies: [{ taskId: 'floor-a', type: 'FS', lag: 0 }] },
    ];
    const { container } = render(
      <DependencyLines
        tasks={[allTasks[0], allTasks[2]]}
        allTasks={allTasks}
        collapsedParentIds={new Set(['work-a', 'work-b'])}
        monthStart={new Date('2026-03-01T00:00:00.000Z')}
        dayWidth={40}
        rowHeight={40}
        gridWidth={1240}
      />
    );
    const path = container.querySelector('.gantt-dependency-virtual');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).not.toContain('NaN');
  });

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

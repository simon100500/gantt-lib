import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});

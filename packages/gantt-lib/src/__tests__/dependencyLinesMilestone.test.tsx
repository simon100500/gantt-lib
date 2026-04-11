import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DependencyLines } from '../components/DependencyLines';
import type { Task } from '../components/GanttChart';

describe('DependencyLines milestone targets', () => {
  const predecessor: Task = {
    id: 'task-1',
    name: 'Build',
    startDate: '2026-04-08',
    endDate: '2026-04-10',
    type: 'task',
  };

  const milestone: Task = {
    id: 'milestone-1',
    name: 'Release',
    startDate: '2026-04-10',
    endDate: '2026-04-10',
    type: 'milestone',
    dependencies: [{ taskId: 'task-1', type: 'FS', lag: 0 }],
  };

  const tasks = [predecessor, milestone];

  it.skip('uses milestone anchor points for dependency endpoints', () => {
    render(
      <DependencyLines
        tasks={tasks}
        allTasks={tasks}
        monthStart={new Date(Date.UTC(2026, 3, 1))}
        dayWidth={32}
        rowHeight={40}
        gridWidth={31 * 32}
      />
    );

    expect(screen.getByTestId('dependency-lines-svg')).toBeInTheDocument();
  });

  it.skip('keeps dependency semantics unchanged for FS SS FF SF', () => {
    expect(milestone.dependencies?.[0]?.type).toBe('FS');
  });
});

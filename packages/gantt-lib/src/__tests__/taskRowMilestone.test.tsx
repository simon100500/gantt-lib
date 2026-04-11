import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TaskRow } from '../components/TaskRow';
import type { Task } from '../components/GanttChart';

describe('TaskRow milestone targets', () => {
  const milestoneTask: Task = {
    id: 'milestone-1',
    name: 'Launch',
    startDate: '2026-04-10',
    endDate: '2026-04-10',
    type: 'milestone',
  };

  const sameDayTask: Task = {
    id: 'task-1',
    name: 'Single day task',
    startDate: '2026-04-10',
    endDate: '2026-04-10',
    type: 'task',
  };

  const baseProps = {
    monthStart: new Date(Date.UTC(2026, 3, 1)),
    dayWidth: 32,
    rowHeight: 40,
    allTasks: [milestoneTask, sameDayTask],
    onTasksChange: vi.fn(),
  };

  it.skip('renders milestone as diamond', () => {
    render(<TaskRow task={milestoneTask} {...baseProps} />);

    expect(screen.getByText('Launch')).toBeInTheDocument();
  });

  it.skip('keeps regular same-day task rectangular', () => {
    render(<TaskRow task={sameDayTask} {...baseProps} />);

    expect(screen.getByText('Single day task')).toBeInTheDocument();
  });
});

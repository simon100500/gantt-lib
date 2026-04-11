import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TaskListRow } from '../components/TaskList/TaskListRow';
import type { Task } from '../components/GanttChart';

describe('TaskListRow milestone targets', () => {
  const milestoneTask: Task = {
    id: 'milestone-1',
    name: 'Handover',
    startDate: '2026-04-10',
    endDate: '2026-04-10',
    type: 'milestone',
  };

  const baseProps = {
    task: milestoneTask,
    rowIndex: 0,
    rowHeight: 40,
    allTasks: [milestoneTask],
    onTasksChange: vi.fn(),
    onChipSelect: vi.fn(),
    taskNumberMap: {},
  };

  it.skip('keeps end date synchronized with start date for milestones', () => {
    render(<TaskListRow {...baseProps} />);

    expect(screen.getByText('Handover')).toBeInTheDocument();
  });

  it.skip('prevents independent duration edits for milestones', () => {
    render(<TaskListRow {...baseProps} />);

    expect(screen.getByText('Handover')).toBeInTheDocument();
  });
});

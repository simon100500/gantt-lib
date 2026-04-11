import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TaskListRow } from '../components/TaskList/TaskListRow';
import { createBuiltInColumns } from '../components/TaskList/columns/createBuiltInColumns';
import type { Task } from '../components/GanttChart';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (isoDate: string) => void;
  }) => (
    <button type="button" aria-label={value} onClick={() => onChange?.('2026-04-12')}>
      {value}
    </button>
  ),
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

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
    resolvedColumns: createBuiltInColumns(),
  };

  it('keeps end date synchronized with start date for milestones', () => {
    const onTasksChange = vi.fn();
    render(<TaskListRow {...baseProps} onTasksChange={onTasksChange} />);

    fireEvent.click(screen.getAllByRole('button', { name: '2026-04-10' })[0]);

    expect(onTasksChange).toHaveBeenCalledWith([
      {
        ...milestoneTask,
        startDate: '2026-04-12',
        endDate: '2026-04-12',
      },
    ]);
  });

  it('shows 0 duration for milestones and opens editor on click', () => {
    const { container } = render(<TaskListRow {...baseProps} />);

    const durationCell = container.querySelector('.gantt-tl-cell-duration');
    // Milestones show "0" in the duration cell
    expect(durationCell?.textContent?.trim()).toBe('0');

    fireEvent.click(durationCell!);

    // Editor should open with value 0
    expect(screen.queryByDisplayValue('0')).not.toBeNull();
    // Should not show legacy value "1"
    expect(screen.queryByDisplayValue('1')).toBeNull();
  });
});

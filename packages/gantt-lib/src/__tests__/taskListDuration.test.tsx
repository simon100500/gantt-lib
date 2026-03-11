import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskListRow } from '../components/TaskList/TaskListRow';
import type { Task } from '../components/GanttChart';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('TaskListRow duration editing', () => {
  it('recalculates endDate when duration changes', () => {
    const onTaskChange = vi.fn();
    const task: Task = {
      id: 'task-1',
      name: 'Task 1',
      startDate: '2026-03-01',
      endDate: '2026-03-03',
      progress: 25,
    };

    const { container } = render(
      <TaskListRow
        task={task}
        rowIndex={0}
        rowHeight={40}
        onTaskChange={onTaskChange}
        onRowClick={() => {}}
        onChipSelect={() => {}}
      />
    );

    const durationCell = container.querySelector('.gantt-tl-cell-duration');
    expect(durationCell).not.toBeNull();

    fireEvent.click(durationCell!);

    const input = screen.getByDisplayValue('3');
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onTaskChange).toHaveBeenCalledWith({
      ...task,
      endDate: '2026-03-05',
    });
  });
});

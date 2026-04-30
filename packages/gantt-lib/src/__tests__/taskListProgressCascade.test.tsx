import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TaskListRow } from '../components/TaskList/TaskListRow';
import { createBuiltInColumns } from '../components/TaskList/columns/createBuiltInColumns';
import type { Task } from '../components/GanttChart';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: () => null,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('TaskListRow progress cascade', () => {
  it('cascades 100% progress from a grandparent to all descendants', () => {
    const grandparent: Task = {
      id: 'grandparent',
      name: 'Grandparent',
      startDate: '2026-04-01',
      endDate: '2026-04-10',
      progress: 0,
    };
    const parent: Task = {
      id: 'parent',
      name: 'Parent',
      startDate: '2026-04-02',
      endDate: '2026-04-08',
      parentId: 'grandparent',
      progress: 0,
    };
    const grandchild: Task = {
      id: 'grandchild',
      name: 'Grandchild',
      startDate: '2026-04-03',
      endDate: '2026-04-05',
      parentId: 'parent',
      progress: 0,
    };
    const onTasksChange = vi.fn();

    render(
      <TaskListRow
        task={grandparent}
        rowIndex={0}
        rowHeight={40}
        allTasks={[grandparent, parent, grandchild]}
        onTasksChange={onTasksChange}
        onChipSelect={vi.fn()}
        taskNumberMap={{}}
        resolvedColumns={createBuiltInColumns()}
      />
    );

    fireEvent.click(screen.getByText('-'));

    const input = screen.getByDisplayValue('0');
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onTasksChange).toHaveBeenCalledWith([
      { ...grandparent, progress: 100 },
      { ...parent, progress: 100 },
      { ...grandchild, progress: 100 },
    ]);
  });
});

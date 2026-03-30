import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskListRow } from '../components/TaskList/TaskListRow';
import { createBuiltInColumns } from '../components/TaskList/columns/createBuiltInColumns';
import type { Task } from '../components/GanttChart';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('TaskListRow hierarchy rendering', () => {
  const resolvedColumns = createBuiltInColumns<Task>();

  it('renders the name trigger for a root parent task', () => {
    const parent: Task = {
      id: 'parent',
      name: 'Parent task',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      progress: 0,
    };
    const child: Task = {
      id: 'child',
      name: 'Child task',
      startDate: '2026-03-02',
      endDate: '2026-03-04',
      progress: 0,
      parentId: 'parent',
    };

    render(
      <TaskListRow
        task={parent}
        allTasks={[parent, child]}
        rowIndex={0}
        rowHeight={40}
        onRowClick={() => {}}
        onChipSelect={() => {}}
        resolvedColumns={resolvedColumns}
      />
    );

    expect(screen.getByRole('button', { name: 'Parent task' })).toBeTruthy();
  });

  it('renders the vertical connector for a first-level child row', () => {
    const parent: Task = {
      id: 'parent',
      name: 'Parent task',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      progress: 0,
    };
    const child: Task = {
      id: 'child',
      name: 'Child task',
      startDate: '2026-03-02',
      endDate: '2026-03-04',
      progress: 0,
      parentId: 'parent',
    };

    render(
      <TaskListRow
        task={child}
        allTasks={[parent, child]}
        rowIndex={1}
        rowHeight={40}
        nestingDepth={1}
        isLastChild={true}
        ancestorContinues={[]}
        onRowClick={() => {}}
        onChipSelect={() => {}}
        resolvedColumns={resolvedColumns}
      />
    );

    expect(screen.getByTestId('gantt-tl-child-connector-vertical')).toBeTruthy();
  });

  it('shows the name input when a root parent task is double-clicked', () => {
    const parent: Task = {
      id: 'parent',
      name: 'Parent task',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      progress: 0,
    };
    const child: Task = {
      id: 'child',
      name: 'Child task',
      startDate: '2026-03-02',
      endDate: '2026-03-04',
      progress: 0,
      parentId: 'parent',
    };

    render(
      <TaskListRow
        task={parent}
        allTasks={[parent, child]}
        rowIndex={0}
        rowHeight={40}
        onRowClick={() => {}}
        onChipSelect={() => {}}
        resolvedColumns={resolvedColumns}
      />
    );

    fireEvent.doubleClick(screen.getByRole('button', { name: 'Parent task' }));

    expect(screen.getByDisplayValue('Parent task')).toBeTruthy();
  });

  it('renders the parent connector tail below the chevron for a root parent task', () => {
    const parent: Task = {
      id: 'parent',
      name: 'Parent task',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      progress: 0,
    };
    const child: Task = {
      id: 'child',
      name: 'Child task',
      startDate: '2026-03-02',
      endDate: '2026-03-04',
      progress: 0,
      parentId: 'parent',
    };

    render(
      <TaskListRow
        task={parent}
        allTasks={[parent, child]}
        rowIndex={0}
        rowHeight={40}
        onRowClick={() => {}}
        onChipSelect={() => {}}
        resolvedColumns={resolvedColumns}
      />
    );

    expect(screen.getByTestId('gantt-tl-parent-connector-tail')).toBeTruthy();
  });

  it('applies selected color to a parent and all descendants', () => {
    const onTasksChange = vi.fn();
    const parent: Task = {
      id: 'parent',
      name: 'Parent task',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      progress: 0,
    };
    const child: Task = {
      id: 'child',
      name: 'Child task',
      startDate: '2026-03-02',
      endDate: '2026-03-04',
      progress: 0,
      parentId: 'parent',
    };

    render(
      <TaskListRow
        task={parent}
        allTasks={[parent, child]}
        rowIndex={0}
        rowHeight={40}
        onTasksChange={onTasksChange}
        onRowClick={() => {}}
        onChipSelect={() => {}}
        resolvedColumns={resolvedColumns}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Цвет/i }));
    fireEvent.click(screen.getByLabelText('Выбрать цвет Red'));

    expect(onTasksChange).toHaveBeenCalledWith([
      { ...parent, color: '#EF4444' },
      { ...child, color: '#EF4444' },
    ]);
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskListRow } from '../components/TaskList/TaskListRow';
import type { Task } from '../components/GanttChart';
import { universalCascade } from '../utils/dependencyUtils';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (isoDate: string) => void;
  }) => (
    <button
      type="button"
      aria-label={value}
      onClick={() => {
        if (value === '2026-03-13') onChange?.('2026-03-17');
        if (value === '2026-03-16') onChange?.('2026-03-18');
        if (value === '2026-03-14') onChange?.('2026-03-09');
      }}
    >
      {value}
    </button>
  ),
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('TaskListRow duration editing', () => {
  it('updates the visible end date immediately and saves on confirm', () => {
    const onTasksChange = vi.fn();
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
        onTasksChange={onTasksChange}
        onRowClick={() => {}}
        onChipSelect={() => {}}
      />
    );

    const durationCell = container.querySelector('.gantt-tl-cell-duration');
    expect(durationCell).not.toBeNull();

    fireEvent.click(durationCell!);

    const input = screen.getByDisplayValue('3');
    fireEvent.change(input, { target: { value: '5' } });

    expect(screen.getByRole('button', { name: '2026-03-05' })).toBeTruthy();
    expect(onTasksChange).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onTasksChange).toHaveBeenCalledWith([{
      ...task,
      endDate: '2026-03-05',
    }]);
  });

  it('preserves business-day duration when moving the start date from the picker', () => {
    const onTasksChange = vi.fn();
    const task: Task = {
      id: 'task-1',
      name: 'Task 1',
      startDate: '2026-03-13',
      endDate: '2026-03-16',
      progress: 25,
    };

    render(
      <TaskListRow
        task={task}
        rowIndex={0}
        rowHeight={40}
        onTasksChange={onTasksChange}
        onRowClick={() => {}}
        onChipSelect={() => {}}
        businessDays={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '2026-03-13' }));

    expect(onTasksChange).toHaveBeenCalledWith([{
      ...task,
      startDate: '2026-03-17',
      endDate: '2026-03-18',
    }]);
  });

  it('preserves business-day duration when moving the end date from the picker', () => {
    const onTasksChange = vi.fn();
    const task: Task = {
      id: 'task-1',
      name: 'Task 1',
      startDate: '2026-03-13',
      endDate: '2026-03-16',
      progress: 25,
    };

    render(
      <TaskListRow
        task={task}
        rowIndex={0}
        rowHeight={40}
        onTasksChange={onTasksChange}
        onRowClick={() => {}}
        onChipSelect={() => {}}
        businessDays={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '2026-03-16' }));

    expect(onTasksChange).toHaveBeenCalledWith([{
      ...task,
      startDate: '2026-03-17',
      endDate: '2026-03-18',
    }]);
  });

  it('keeps the edited task in cascade results alongside shifted successors', () => {
    const movedTask: Task = {
      id: 'task-1',
      name: 'Current Task',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      progress: 0,
    };
    const successor: Task = {
      id: 'task-2',
      name: 'Next Task',
      startDate: '2026-03-13',
      endDate: '2026-03-14',
      progress: 0,
      dependencies: [{ taskId: 'task-1', type: 'FS' }],
    };

    const cascaded = universalCascade(
      { ...movedTask, startDate: '2026-03-11', endDate: '2026-03-13' },
      new Date('2026-03-11T00:00:00Z'),
      new Date('2026-03-13T00:00:00Z'),
      [movedTask, successor]
    );

    expect(cascaded.find((task) => task.id === 'task-1')).toMatchObject({
      id: 'task-1',
      startDate: '2026-03-11',
      endDate: '2026-03-13',
    });
    expect(cascaded.find((task) => task.id === 'task-2')).toBeDefined();
  });

  it('shows dependency chip lag in business days after a weekend-crossing shift', () => {
    const predecessor: Task = {
      id: 'pred',
      name: 'Pred',
      startDate: '2026-03-03',
      endDate: '2026-03-09',
      progress: 0,
    };
    const successor: Task = {
      id: 'succ',
      name: 'Succ',
      startDate: '2026-03-12',
      endDate: '2026-03-18',
      progress: 0,
      dependencies: [{ taskId: 'pred', type: 'FF', lag: 7 }],
    };

    render(
      <TaskListRow
        task={successor}
        allTasks={[predecessor, successor]}
        rowIndex={0}
        rowHeight={40}
        onTasksChange={vi.fn()}
        onRowClick={() => {}}
        onChipSelect={() => {}}
        businessDays={true}
      />
    );

    expect(screen.getByText('+7')).toBeTruthy();
  });

  it('recalculates incoming lag when start date is changed from the picker', () => {
    const onTasksChange = vi.fn();
    const predecessor: Task = {
      id: 'pred',
      name: 'Pred',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      progress: 0,
    };
    const task: Task = {
      id: 'task-1',
      name: 'Task 1',
      startDate: '2026-03-13',
      endDate: '2026-03-16',
      progress: 25,
      dependencies: [{ taskId: 'pred', type: 'FS', lag: 0 }],
    };

    render(
      <TaskListRow
        task={task}
        allTasks={[predecessor, task]}
        rowIndex={0}
        rowHeight={40}
        onTasksChange={onTasksChange}
        onRowClick={() => {}}
        onChipSelect={() => {}}
        businessDays={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '2026-03-13' }));

    expect(onTasksChange).toHaveBeenCalledWith([{
      ...task,
      startDate: '2026-03-17',
      endDate: '2026-03-18',
      dependencies: [{ taskId: 'pred', type: 'FS', lag: 2 }],
    }]);
  });

  it('clamps FS lag editing to predecessor duration', () => {
    const onTasksChange = vi.fn();
    const predecessor: Task = {
      id: 'pred',
      name: 'Pred',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      progress: 0,
    };
    const task: Task = {
      id: 'task-1',
      name: 'Task 1',
      startDate: '2026-03-13',
      endDate: '2026-03-15',
      progress: 25,
      dependencies: [{ taskId: 'pred', type: 'FS', lag: 0 }],
    };

    const { container } = render(
      <TaskListRow
        task={task}
        allTasks={[predecessor, task]}
        rowIndex={0}
        rowHeight={40}
        onTasksChange={onTasksChange}
        onRowClick={() => {}}
        onChipSelect={() => {}}
        businessDays={true}
      />
    );

    const lagInput = container.querySelector('.gantt-tl-dep-edit-input') as HTMLInputElement;
    expect(lagInput).toBeTruthy();

    fireEvent.change(lagInput, { target: { value: '-10' } });
    fireEvent.blur(lagInput);

    expect(onTasksChange).toHaveBeenLastCalledWith([{
      ...task,
      startDate: '2026-03-10',
      endDate: '2026-03-10',
      dependencies: [{ taskId: 'pred', type: 'FS', lag: -3 }],
    }]);
  });

  it('clamps FS range when start date picker would exceed predecessor duration overlap', () => {
    const onTasksChange = vi.fn();
    const predecessor: Task = {
      id: 'pred',
      name: 'Pred',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      progress: 0,
    };
    const task: Task = {
      id: 'task-1',
      name: 'Task 1',
      startDate: '2026-03-14',
      endDate: '2026-03-16',
      progress: 25,
      dependencies: [{ taskId: 'pred', type: 'FS', lag: 1 }],
    };

    render(
      <TaskListRow
        task={task}
        allTasks={[predecessor, task]}
        rowIndex={0}
        rowHeight={40}
        onTasksChange={onTasksChange}
        onRowClick={() => {}}
        onChipSelect={() => {}}
        businessDays={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '2026-03-14' }));

    expect(onTasksChange).toHaveBeenCalledWith([{
      ...task,
      startDate: '2026-03-10',
      endDate: '2026-03-10',
      dependencies: [{ taskId: 'pred', type: 'FS', lag: -3 }],
    }]);
  });

  it('filters dependency candidates and adds a link from the search picker', () => {
    const onAddDependency = vi.fn();
    const predecessor: Task = {
      id: 'pred',
      name: 'Подготовка основания',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      progress: 0,
    };
    const task: Task = {
      id: 'task-1',
      name: 'Укладка плитки',
      startDate: '2026-03-14',
      endDate: '2026-03-16',
      progress: 25,
    };

    render(
      <TaskListRow
        task={task}
        allTasks={[predecessor, task]}
        rowIndex={1}
        rowHeight={40}
        taskNumber="2"
        taskNumberMap={{ pred: '1.1.1', 'task-1': '2' }}
        selectingPredecessorFor="task-1"
        activeLinkType="FS"
        onAddDependency={onAddDependency}
        onSetSelectingPredecessorFor={() => {}}
        onRowClick={() => {}}
        onChipSelect={() => {}}
      />
    );

    const input = screen.getByPlaceholderText('Укажите предшественника');
    fireEvent.change(input, { target: { value: '1.1.1' } });
    fireEvent.click(screen.getByRole('button', { name: '1.1.1. Подготовка основания' }));

    expect(onAddDependency).toHaveBeenCalledWith('task-1', 'pred', 'FS');
  });
});

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';

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
      aria-label={`date-${value}`}
      onClick={() => {
        if (value === '2026-03-13') onChange?.('2026-03-17');
        if (value === '2026-03-20') onChange?.('2026-03-24');
        if (value === '2026-04-02') onChange?.('2026-04-05');
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

describe('GanttChart task-list date picker targeting', () => {
  it('applies a task-list date-picker change to the current task instead of the next one', () => {
    const initialTasks: Task[] = [
      {
        id: 'task-1',
        name: 'Current Task',
        startDate: '2026-03-13',
        endDate: '2026-03-16',
        progress: 0,
      },
      {
        id: 'task-2',
        name: 'Next Task',
        startDate: '2026-03-20',
        endDate: '2026-03-21',
        progress: 0,
      },
    ];

    const updates: Task[][] = [];

    const Harness = () => {
      const [tasks, setTasks] = React.useState(initialTasks);

      return (
        <GanttChart
          tasks={tasks}
          showTaskList={true}
          rowHeight={36}
          headerHeight={36}
          onTasksChange={(updatedTasks) => {
            updates.push(updatedTasks);
            setTasks((prev) => {
              const updatedMap = new Map(updatedTasks.map((task) => [task.id, task]));
              return prev.map((task) => updatedMap.get(task.id) ?? task);
            });
          }}
        />
      );
    };

    const { container } = render(<Harness />);

    const rows = container.querySelectorAll('.gantt-tl-row');
    expect(rows).toHaveLength(2);

    fireEvent.click(within(rows[0] as HTMLElement).getByRole('button', { name: 'date-2026-03-13' }));

    expect(updates.at(-1)).toEqual([
      expect.objectContaining({
        id: 'task-1',
        startDate: '2026-03-17',
        endDate: '2026-03-18',
      }),
    ]);

    const rerenderedRows = container.querySelectorAll('.gantt-tl-row');
    expect(within(rerenderedRows[0] as HTMLElement).getByRole('button', { name: 'date-2026-03-17' })).toBeTruthy();
    expect(within(rerenderedRows[1] as HTMLElement).getByRole('button', { name: 'date-2026-03-20' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'date-2026-03-24' })).toBeNull();
  });

  it('shifts a parent task from task-list date picker together with its child tasks', () => {
    const initialTasks: Task[] = [
      {
        id: 'parent',
        name: 'Parent',
        startDate: '2026-04-02',
        endDate: '2026-04-03',
        progress: 0,
      },
      {
        id: 'child',
        name: 'Child',
        startDate: '2026-04-02',
        endDate: '2026-04-03',
        progress: 0,
        parentId: 'parent',
      },
    ];

    const updates: Task[][] = [];

    const Harness = () => {
      const [tasks, setTasks] = React.useState(initialTasks);

      return (
        <GanttChart
          tasks={tasks}
          showTaskList={true}
          rowHeight={36}
          headerHeight={36}
          onTasksChange={(updatedTasks) => {
            updates.push(updatedTasks);
            setTasks((prev) => {
              const updatedMap = new Map(updatedTasks.map((task) => [task.id, task]));
              return prev.map((task) => updatedMap.get(task.id) ?? task);
            });
          }}
        />
      );
    };

    const { container } = render(<Harness />);
    const rows = container.querySelectorAll('.gantt-tl-row');

    fireEvent.click(within(rows[0] as HTMLElement).getByRole('button', { name: 'date-2026-04-02' }));

    expect(updates.at(-1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'parent',
          startDate: '2026-04-06',
          endDate: '2026-04-07',
        }),
        expect.objectContaining({
          id: 'child',
          startDate: '2026-04-06',
          endDate: '2026-04-07',
        }),
      ])
    );
  });
});

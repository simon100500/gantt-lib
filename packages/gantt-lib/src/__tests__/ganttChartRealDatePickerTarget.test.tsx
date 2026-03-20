import React from 'react';
import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/ui/Calendar', () => ({
  Calendar: () => <div data-testid="calendar" />,
}));

describe('GanttChart real DatePicker targeting', () => {
  it('keeps the +1 popup shift bound to the current row', () => {
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
        endDate: '2026-03-23',
        progress: 0,
      },
    ];

    const Harness = () => {
      const [tasks, setTasks] = React.useState(initialTasks);

      return (
        <GanttChart
          tasks={tasks}
          showTaskList={true}
          rowHeight={36}
          headerHeight={36}
          businessDays={true}
          onTasksChange={(updatedTasks) => {
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

    const firstStartDateCell = (rows[0] as HTMLElement).querySelectorAll('.gantt-tl-cell-date')[0] as HTMLElement;
    const secondStartDateCell = (rows[1] as HTMLElement).querySelectorAll('.gantt-tl-cell-date')[0] as HTMLElement;

    const firstPlusOneButton = within(firstStartDateCell).getByRole('button', { name: '+1' });
    fireEvent.mouseDown(firstPlusOneButton);
    fireEvent.click(firstPlusOneButton);

    const rerenderedSecondStartDateCell = (rerenderedRows[1] as HTMLElement).querySelectorAll('.gantt-tl-cell-date')[0] as HTMLElement;

    const triggerValues = Array.from(container.querySelectorAll('.gantt-datepicker-trigger')).map(
      (button) => button.textContent?.trim()
    );

    expect(triggerValues).toEqual([
      '16.03.26',
      '17.03.26',
      '20.03.26',
      '23.03.26',
    ]);

    expect(within(rerenderedSecondStartDateCell).queryByRole('button', { name: '24.03.26' })).toBeNull();
  });

  it('keeps the edited task in place when successors are linked by dependency', () => {
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
        endDate: '2026-03-23',
        progress: 0,
        dependencies: [{ taskId: 'task-1', type: 'FS' }],
      },
    ];

    const Harness = () => {
      const [tasks, setTasks] = React.useState(initialTasks);

      return (
        <GanttChart
          tasks={tasks}
          showTaskList={true}
          rowHeight={36}
          headerHeight={36}
          businessDays={true}
          onTasksChange={(updatedTasks) => {
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
    const firstStartDateCell = (rows[0] as HTMLElement).querySelectorAll('.gantt-tl-cell-date')[0] as HTMLElement;
    const firstPlusOneButton = within(firstStartDateCell).getByRole('button', { name: '+1' });

    fireEvent.mouseDown(firstPlusOneButton);
    fireEvent.click(firstPlusOneButton);

    const triggerValues = Array.from(container.querySelectorAll('.gantt-datepicker-trigger')).map(
      (button) => button.textContent?.trim()
    );

    expect(triggerValues).toEqual([
      '16.03.26',
      '17.03.26',
      '18.03.26',
      '19.03.26',
    ]);
  });
});

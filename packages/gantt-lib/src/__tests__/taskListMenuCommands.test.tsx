import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GanttChart, type Task, type TaskListMenuCommand } from '../components/GanttChart';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('GanttChart taskListMenuCommands', () => {
  it('renders custom row commands and passes the current row to the handler', () => {
    const onSelect = vi.fn();
    const tasks: Task[] = [
      {
        id: 'task-1',
        name: 'Разобрать этап',
        startDate: '2026-04-10',
        endDate: '2026-04-15',
      },
    ];

    const menuCommands: TaskListMenuCommand<Task>[] = [
      {
        id: 'expand-with-ai',
        label: 'Расширить пункт',
        icon: <span aria-hidden="true">AI</span>,
        onSelect,
      },
    ];

    render(
      <GanttChart
        tasks={tasks}
        showTaskList
        rowHeight={36}
        headerHeight={40}
        taskListWidth={660}
        taskListMenuCommands={menuCommands}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /расширить пункт/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(tasks[0]);
  });

  it('distinguishes group and linear commands by row kind', () => {
    const onGroupSelect = vi.fn();
    const onLinearSelect = vi.fn();
    const onMilestoneSelect = vi.fn();
    const tasks: Task[] = [
      {
        id: 'group-1',
        name: 'Раздел',
        startDate: '2026-04-10',
        endDate: '2026-04-15',
      },
      {
        id: 'task-1',
        name: 'Обычная задача',
        startDate: '2026-04-11',
        endDate: '2026-04-12',
        parentId: 'group-1',
      },
      {
        id: 'milestone-1',
        name: 'Контрольная точка',
        startDate: '2026-04-13',
        endDate: '2026-04-13',
        type: 'milestone',
      },
    ];

    const menuCommands: TaskListMenuCommand<Task>[] = [
      {
        id: 'group-command',
        label: 'Команда группы',
        scope: 'group',
        onSelect: onGroupSelect,
      },
      {
        id: 'linear-command',
        label: 'Линейная команда',
        scope: 'linear',
        onSelect: onLinearSelect,
      },
      {
        id: 'milestone-command',
        label: 'Команда вехи',
        scope: 'milestone',
        onSelect: onMilestoneSelect,
      },
    ];

    const { container } = render(
      <GanttChart
        tasks={tasks}
        showTaskList
        rowHeight={36}
        headerHeight={40}
        taskListWidth={660}
        taskListMenuCommands={menuCommands}
      />
    );

    const rows = container.querySelectorAll('.gantt-tl-row');
    expect(rows).toHaveLength(3);

    expect(within(rows[0] as HTMLElement).getByRole('button', { name: /команда группы/i })).toBeTruthy();
    expect(within(rows[0] as HTMLElement).queryByRole('button', { name: /линейная команда/i })).toBeNull();
    expect(within(rows[0] as HTMLElement).queryByRole('button', { name: /команда вехи/i })).toBeNull();

    expect(within(rows[1] as HTMLElement).getByRole('button', { name: /линейная команда/i })).toBeTruthy();
    expect(within(rows[1] as HTMLElement).queryByRole('button', { name: /команда группы/i })).toBeNull();
    expect(within(rows[1] as HTMLElement).queryByRole('button', { name: /команда вехи/i })).toBeNull();

    expect(within(rows[2] as HTMLElement).getByRole('button', { name: /команда вехи/i })).toBeTruthy();
    expect(within(rows[2] as HTMLElement).queryByRole('button', { name: /линейная команда/i })).toBeNull();
    expect(within(rows[2] as HTMLElement).queryByRole('button', { name: /команда группы/i })).toBeNull();
  });
});

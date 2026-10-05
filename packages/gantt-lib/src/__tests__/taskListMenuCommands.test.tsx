// START_MODULE_CONTRACT
// PURPOSE: Verify consumer-owned task actions and native operation capabilities.
// SCOPE: Optional slots, menu commands and hierarchy behavior.
// INPUTS: Chart props and consumer renderers.
// OUTPUTS: Explicit UI and callback assertions.
// END_MODULE_CONTRACT
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

  it('renders visual dividers around commands when requested', () => {
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
        id: 'first',
        label: 'Первый пункт',
        onSelect: vi.fn(),
      },
      {
        id: 'second',
        label: 'Второй пункт',
        divider: 'top',
        onSelect: vi.fn(),
      },
      {
        id: 'third',
        label: 'Третий пункт',
        divider: 'bottom',
        onSelect: vi.fn(),
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

    fireEvent.click(screen.getByRole('button', { name: /дополнительно/i }));

    expect(document.querySelectorAll('.gantt-tl-context-menu-divider')).toHaveLength(2);
  });

  it('renders no implicit action UI even when mutation callbacks exist', () => {
    render(<GanttChart tasks={[{ id: 'one', name: 'One', startDate: '2026-04-10', endDate: '2026-04-15' }]}
      showTaskList onTasksChange={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} onReorder={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /дополнительно/i })).toBeNull();
    expect(screen.queryByText('Цвет')).toBeNull();
    expect(screen.queryByText('Дублировать')).toBeNull();
    expect(screen.queryByText('Удалить работу')).toBeNull();
    expect(document.querySelector('.gantt-tl-name-actions')).toBeNull();
    expect(document.querySelector('.gantt-tl-add-btn')).toBeNull();
  });

  it('composes custom menu content with configured commands and honors disabled commands', () => {
    const select = vi.fn();
    render(<GanttChart tasks={[{ id: 'one', name: 'One', startDate: '2026-04-10', endDate: '2026-04-15' }]}
      showTaskList taskListMenuCommands={[{ id: 'disabled', label: 'Disabled', onSelect: select, isDisabled: () => true }]}
      renderTaskListMenu={(context, commands) => <><span>{context.task.name} menu</span>{commands}</>} />);
    expect(screen.getByText('One menu')).toBeTruthy();
    fireEvent.click(screen.getByText('Disabled'));
    expect(select).not.toHaveBeenCalled();
  });

  it('suppresses both slots and menu trigger when hidden or when renderers return null', () => {
    const tasks: Task[] = [{ id: 'one', name: 'One', startDate: '2026-04-10', endDate: '2026-04-15' }];
    const actions = vi.fn(() => <button>Custom action</button>);
    const menu = vi.fn(() => <button>Custom menu</button>);
    const { rerender } = render(<GanttChart tasks={tasks} showTaskList hideTaskListRowActions
      renderTaskListActions={actions} renderTaskListMenu={menu} />);
    expect(actions).not.toHaveBeenCalled();
    expect(menu).not.toHaveBeenCalled();
    expect(screen.queryByText('Custom action')).toBeNull();
    rerender(<GanttChart tasks={tasks} showTaskList renderTaskListActions={() => null} renderTaskListMenu={() => null} />);
    expect(screen.queryByRole('button', { name: /дополнительно/i })).toBeNull();
  });

  it('exposes only supported operations to a read-only consumer', () => {
    const contexts: import('../components/GanttChart').TaskListActionContext[] = [];
    render(<GanttChart tasks={[{ id: 'one', name: 'One', startDate: '2026-04-10', endDate: '2026-04-15' }]}
      showTaskList renderTaskListActions={context => { contexts.push(context); return null; }} />);
    expect(contexts.length).toBeGreaterThan(0);
    expect(contexts[0]).toMatchObject({ canPromote: false, canDemote: false });
    for (const key of ['insertAfter', 'promote', 'demote', 'duplicate', 'delete', 'ungroup'] as const) {
      expect(contexts[0][key]).toBeUndefined();
    }
  });
  it('adds the footer only when explicitly enabled and removes it on rerender', () => {
    const tasks: Task[] = [{ id: 'one', name: 'One', startDate: '2026-04-10', endDate: '2026-04-15' }];
    const { rerender } = render(<GanttChart tasks={tasks} showTaskList onAdd={vi.fn()} enableAddTask />);
    expect(document.querySelector('.gantt-tl-add-btn')).toBeTruthy();
    rerender(<GanttChart tasks={tasks} showTaskList onAdd={vi.fn()} />);
    expect(document.querySelector('.gantt-tl-add-btn')).toBeNull();
  });

  it('exposes native delete cascade and duplication through consumer buttons', () => {
    const tasks: Task[] = [
      { id: 'parent', name: 'Parent', startDate: '2026-04-10', endDate: '2026-04-15' },
      { id: 'child', name: 'Child', parentId: 'parent', startDate: '2026-04-10', endDate: '2026-04-15' },
    ];
    const onDelete = vi.fn(); const onReorder = vi.fn();
    render(<GanttChart tasks={tasks} showTaskList onDelete={onDelete} onReorder={onReorder}
      renderTaskListActions={context => context.task.id === 'parent' ? <>
        <button onClick={context.delete}>Remove subtree</button>
        <button onClick={context.duplicate}>Copy subtree</button>
      </> : null} />);
    fireEvent.click(screen.getByText('Copy subtree'));
    const copied = onReorder.mock.calls[0][0] as Task[];
    expect(copied).toHaveLength(4);
    const duplicateParent = copied.find(row => row.id !== 'parent' && !row.parentId)!;
    expect(copied.some(row => row.parentId === duplicateParent.id)).toBe(true);
    fireEvent.click(screen.getByText('Remove subtree'));
    expect(onDelete.mock.calls.map(call => call[0])).toEqual(['parent', 'child']);
  });

  it('refreshes slot capabilities when callbacks change on the same tasks', () => {
    const tasks: Task[] = [{ id: 'one', name: 'One', startDate: '2026-04-10', endDate: '2026-04-15' }];
    const renderer = (context: import('../components/GanttChart').TaskListActionContext) => context.delete ? <button onClick={context.delete}>Delete explicit</button> : null;
    const { rerender } = render(<GanttChart tasks={tasks} showTaskList onDelete={vi.fn()} renderTaskListActions={renderer} />);
    expect(screen.getByText('Delete explicit')).toBeTruthy();
    rerender(<GanttChart tasks={tasks} showTaskList renderTaskListActions={renderer} />);
    expect(screen.queryByText('Delete explicit')).toBeNull();
  });

});

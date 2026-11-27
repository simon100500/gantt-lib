import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';
import type { TaskListColumnId } from '../components/TaskList/columns/types';

const tasks: Task[] = [
  { id: 'one', name: 'First task', startDate: '2026-04-10', endDate: '2026-04-15' },
  { id: 'two', name: 'Second task', startDate: '2026-04-16', endDate: '2026-04-18' },
];

describe('Task List menus', () => {
  it('opens the same row menu from the ellipsis and right-click, using the target task', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    const { container } = render(
      <GanttChart
        tasks={tasks}
        showTaskList
        onDelete={onDelete}
        taskListMenuCommands={[{ id: 'custom', label: 'Custom action', onSelect }]}
        renderTaskListMenu={(context, commands) => <>
          {commands}
          <button onClick={() => { context.closeMenu(); context.delete?.(); }}>Delete task</button>
        </>}
      />,
    );
    const [first, second] = container.querySelectorAll<HTMLElement>('.gantt-tl-row');

    fireEvent.click(within(first).getByRole('button', { name: 'Дополнительно' }));
    fireEvent.click(screen.getByRole('button', { name: 'Custom action' }));
    expect(onSelect).toHaveBeenLastCalledWith(tasks[0]);

    const cell = second.querySelector('.gantt-tl-cell-number')!;
    expect(fireEvent.contextMenu(cell, { clientX: 120, clientY: 90 })).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Custom action' }));
    expect(onSelect).toHaveBeenLastCalledWith(tasks[1]);

    fireEvent.contextMenu(cell);
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(tasks[1].id);
    expect(screen.queryByRole('button', { name: 'Delete task' })).toBeNull();
  });

  it('leaves the browser context menu available on rows with hidden actions', () => {
    render(<GanttChart tasks={tasks} showTaskList hideTaskListRowActions
      taskListMenuCommands={[{ id: 'custom', label: 'Custom action', onSelect: vi.fn() }]} />);

    expect(fireEvent.contextMenu(screen.getByRole('button', { name: 'First task' }))).toBe(true);
    expect(screen.queryByRole('button', { name: 'Custom action' })).toBeNull();
  });

  it('hides and restores a column without a host visibility handler', () => {
    const { container } = render(<GanttChart tasks={tasks} showTaskList />);
    const header = container.querySelector('.gantt-tl-header [data-column-id="name"]') as HTMLElement;
    fireEvent.click(within(header).getByRole('button', { name: 'Видимость столбцов' }));

    const progress = screen.getByRole('checkbox', { name: '%' });
    expect(progress).toHaveProperty('checked', true);
    fireEvent.click(progress);
    expect(progress).toHaveProperty('checked', false);
    expect(container.querySelector('[data-column-id="progress"]')).toBeNull();

    fireEvent.click(progress);
    expect(container.querySelector('.gantt-tl-header [data-column-id="progress"]')).toBeTruthy();
    expect(container.querySelector('.gantt-tl-row .gantt-tl-cell-progress')).toBeTruthy();
  });

  it('restores a hidden custom column from the controlled empty header', () => {
    const initialHidden: TaskListColumnId[] = [
      'number', 'name', 'startDate', 'endDate', 'duration', 'progress', 'dependencies', 'owner',
    ];
    const onChange = vi.fn();
    function ControlledChart() {
      const [hidden, setHidden] = useState(initialHidden);
      return (
        <GanttChart tasks={tasks} showTaskList hiddenTaskListColumns={hidden}
          additionalColumns={[{ id: 'owner', header: 'Owner', renderCell: () => 'Team A' }]}
          onHiddenTaskListColumnsChange={next => { onChange(next); setHidden(next); }} />
      );
    }

    render(<ControlledChart />);
    fireEvent.click(screen.getByRole('button', { name: 'Видимость столбцов' }));
    const owner = screen.getByRole('checkbox', { name: 'Owner' });
    expect(owner).toHaveProperty('checked', false);
    fireEvent.click(owner);
    expect(onChange).toHaveBeenCalledWith(initialHidden.filter(id => id !== 'owner'));
    expect(screen.getAllByText('Team A')).toHaveLength(2);
  });
});

// START_MODULE_CONTRACT
// PURPOSE: Verify consumer-owned task actions and native operation capabilities.
// SCOPE: Optional slots, menu commands and hierarchy behavior.
// INPUTS: Chart props and consumer renderers.
// OUTPUTS: Explicit UI and callback assertions.
// END_MODULE_CONTRACT
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('GanttChart ungroup task', () => {
  it('keeps the parent and promotes its direct children by one level', () => {
    const onTasksChange = vi.fn();
    const onDelete = vi.fn();

    const parent: Task = {
      id: 'parent',
      name: 'Parent',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
    };
    const firstChild: Task = {
      id: 'child-1',
      name: 'Child 1',
      startDate: '2026-03-02',
      endDate: '2026-03-03',
      parentId: 'parent',
    };
    const secondChild: Task = {
      id: 'child-2',
      name: 'Child 2',
      startDate: '2026-03-04',
      endDate: '2026-03-05',
      parentId: 'parent',
    };
    const grandChild: Task = {
      id: 'grandchild',
      name: 'Grandchild',
      startDate: '2026-03-04',
      endDate: '2026-03-05',
      parentId: 'child-2',
    };
    const dependent: Task = {
      id: 'dependent',
      name: 'Dependent',
      startDate: '2026-03-06',
      endDate: '2026-03-07',
      dependencies: [{ taskId: 'parent', type: 'FS', lag: 0 }],
    };

    render(
      <GanttChart
        tasks={[parent, firstChild, secondChild, grandChild, dependent]}
        showTaskList
        showChart={false}
        renderTaskListActions={context => context.promote ? <button title="Повысить уровень" onClick={context.promote}>Promote</button> : null}
        renderTaskListMenu={context => context.ungroup ? <button onClick={context.ungroup}>Разгруппировать</button> : null}
        onTasksChange={onTasksChange}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getAllByText('Разгруппировать')[0]);

    expect(onTasksChange).toHaveBeenCalledWith([
      { ...firstChild, parentId: undefined, dependencies: undefined },
      { ...secondChild, parentId: undefined, dependencies: undefined },
      { ...dependent, dependencies: [] },
    ]);
    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe('GanttChart promote task', () => {
  it('promotes the last child one level up without moving it after the next root task', () => {
    const onTasksChange = vi.fn();

    const parent: Task = {
      id: 'parent',
      name: 'Parent',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
    };
    const firstChild: Task = {
      id: 'child-1',
      name: 'Child 1',
      startDate: '2026-03-02',
      endDate: '2026-03-03',
      parentId: 'parent',
    };
    const lastChild: Task = {
      id: 'child-2',
      name: 'Child 2',
      startDate: '2026-03-04',
      endDate: '2026-03-05',
      parentId: 'parent',
    };
    const nextRoot: Task = {
      id: 'next-root',
      name: 'Next root',
      startDate: '2026-03-06',
      endDate: '2026-03-07',
    };

    render(
      <GanttChart
        tasks={[parent, firstChild, lastChild, nextRoot]}
        showTaskList
        showChart={false}
        renderTaskListActions={context => context.promote ? <button title="Повысить уровень" onClick={context.promote}>Promote</button> : null}
        renderTaskListMenu={context => context.ungroup ? <button onClick={context.ungroup}>Разгруппировать</button> : null}
        onTasksChange={onTasksChange}
      />
    );

    fireEvent.click(screen.getAllByTitle('Повысить уровень')[1]);

    const updatedTasks = onTasksChange.mock.calls[0]?.[0] as Task[];

    expect(updatedTasks.map(task => task.id)).toEqual([
      'parent',
      'child-1',
      'child-2',
      'next-root',
    ]);
    expect(updatedTasks.find(task => task.id === 'child-2')?.parentId).toBeUndefined();
  });
});

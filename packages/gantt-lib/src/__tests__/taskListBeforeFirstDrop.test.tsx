import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskList } from '../components/TaskList/TaskList';
import type { Task } from '../components/GanttChart';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('TaskList before-first drop zone', () => {
  it('does not cover the first row handle when dragging starts from the first row', () => {
    const tasks: Task[] = [
      {
        id: 'first',
        name: 'First task',
        startDate: '2026-03-01',
        endDate: '2026-03-02',
      },
      {
        id: 'second',
        name: 'Second task',
        startDate: '2026-03-03',
        endDate: '2026-03-04',
      },
    ];

    const { container } = render(
      <TaskList
        tasks={tasks}
        rowHeight={40}
        headerHeight={40}
        show
        onReorder={() => {}}
      />
    );

    const firstRow = container.querySelector('[data-gantt-task-row-id="first"]') as HTMLElement;
    const dragHandle = firstRow.querySelector('.gantt-tl-drag-handle') as HTMLElement;

    fireEvent.dragStart(dragHandle, { dataTransfer: { effectAllowed: '', dropEffect: '' } });

    expect(container.querySelector('.gantt-tl-before-first-drop-zone')).toBeNull();
  });

  it('moves a child row above the first parent row instead of rejecting the drop', () => {
    const onReorder = vi.fn();
    const parent: Task = {
      id: 'parent',
      name: 'Parent task',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
    };
    const child: Task = {
      id: 'child',
      name: 'Child task',
      startDate: '2026-03-02',
      endDate: '2026-03-04',
      parentId: 'parent',
    };
    const sibling: Task = {
      id: 'sibling',
      name: 'Sibling task',
      startDate: '2026-03-06',
      endDate: '2026-03-07',
    };

    const { container } = render(
      <TaskList
        tasks={[parent, child, sibling]}
        rowHeight={40}
        headerHeight={40}
        show
        onReorder={onReorder}
      />
    );

    const movedRow = container.querySelector('[data-gantt-task-row-id="child"]') as HTMLElement;
    const dragHandle = movedRow.querySelector('.gantt-tl-drag-handle') as HTMLElement;
    const dataTransfer = { effectAllowed: '', dropEffect: '' };

    fireEvent.dragStart(dragHandle, { dataTransfer });

    const dropZone = container.querySelector('.gantt-tl-before-first-drop-zone') as HTMLElement;
    expect(dropZone).toBeTruthy();

    fireEvent.dragOver(dropZone, { dataTransfer });
    expect(dropZone.classList.contains('gantt-tl-before-first-drop-zone-active')).toBe(true);

    fireEvent.drop(dropZone, { dataTransfer });

    expect(onReorder).toHaveBeenCalledTimes(1);
    const [reorderedTasks, movedTaskId, inferredParentId] = onReorder.mock.calls[0] as [Task[], string, string | undefined];
    expect(reorderedTasks.map(task => task.id)).toEqual(['child', 'parent', 'sibling']);
    expect(movedTaskId).toBe('child');
    expect(inferredParentId).toBeUndefined();
  });
});

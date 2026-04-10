import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

describe('manual dependency linking', () => {
  it('preserves the newly created dependency in onTasksChange when successor is snapped', () => {
    Element.prototype.scrollIntoView = vi.fn();

    const onTasksChange = vi.fn();
    const tasks: Task[] = [
      {
        id: 'pred',
        name: 'Predecessor',
        startDate: '2026-03-02',
        endDate: '2026-03-04',
        progress: 0,
      },
      {
        id: 'succ',
        name: 'Successor',
        startDate: '2026-03-10',
        endDate: '2026-03-12',
        progress: 0,
      },
    ];

    const { container } = render(
      <GanttChart
        tasks={tasks}
        showTaskList={true}
        rowHeight={36}
        headerHeight={36}
        businessDays={true}
        onTasksChange={onTasksChange}
      />
    );

    const rows = container.querySelectorAll('.gantt-tl-row');
    expect(rows).toHaveLength(2);

    const successorRow = rows[1] as HTMLElement;
    fireEvent.click(within(successorRow).getByRole('button', { name: 'Добавить связь' }));
    fireEvent.click(screen.getByRole('button', { name: 'Предшественник' }));
    fireEvent.click(screen.getByRole('button', { name: /^1\. Predecessor$/i }));

    expect(onTasksChange).toHaveBeenCalled();

    const lastCall = onTasksChange.mock.calls.at(-1)?.[0] as Task[] | undefined;
    expect(lastCall).toBeDefined();

    const updatedSuccessor = lastCall?.find((task) => task.id === 'succ');
    expect(updatedSuccessor?.dependencies).toEqual([
      { taskId: 'pred', type: 'FS', lag: 0 },
    ]);
    expect(updatedSuccessor?.startDate).toBe('2026-03-05');
    expect(updatedSuccessor?.endDate).toBe('2026-03-09');
  });
});

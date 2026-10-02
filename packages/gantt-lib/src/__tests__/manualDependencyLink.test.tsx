// START_MODULE_CONTRACT
// PURPOSE: Verify manual links preserve structural edits with and without controlled scheduling.
// SCOPE: Connection ports, column picker and dependency-before-schedule callback ordering.
// INPUTS: Two tasks, native picker events and host callbacks.
// OUTPUTS: Retained edge and exclusive schedule intent with original dates in structural changes.
// END_MODULE_CONTRACT
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  it.each(['predecessor', 'successor'] as const)('preserves a column-created edge before its schedule intent in %s mode', direction => {
    Element.prototype.scrollIntoView = vi.fn();
    const onTasksChange = vi.fn();
    const onScheduleIntent = vi.fn();
    const tasks: Task[] = [
      { id: 'pred', name: 'Predecessor', startDate: '2026-03-02', endDate: '2026-03-04' },
      { id: 'succ', name: 'Successor', startDate: '2026-03-10', endDate: '2026-03-12' },
    ];
    const { container } = render(<GanttChart tasks={tasks} showTaskList businessDays={false} onTasksChange={onTasksChange} onScheduleIntent={onScheduleIntent} />);
    const row = container.querySelectorAll('.gantt-tl-row')[direction === 'predecessor' ? 1 : 0] as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Добавить связь' }));
    if (direction === 'predecessor') fireEvent.click(screen.getByRole('button', { name: 'Предшественник' }));
    fireEvent.click(screen.getByRole('button', { name: direction === 'predecessor' ? /^1\. Predecessor$/i : /^2\. Successor$/i }));
    expect(onTasksChange).toHaveBeenCalledExactlyOnceWith([{ ...tasks[1], dependencies: [{ taskId: 'pred', type: 'FS', lag: 0 }] }]);
    expect(onScheduleIntent).toHaveBeenCalledExactlyOnceWith({ type: 'move_task', taskId: 'succ', startDate: '2026-03-05' });
    expect(onTasksChange.mock.invocationCallOrder[0]).toBeLessThan(onScheduleIntent.mock.invocationCallOrder[0]);
  });
  it('removes dependency-link hit targets on touch/coarse-pointer devices', () => {
    const stylesheet = readFileSync(resolve(process.cwd(), 'src/components/TaskRow/TaskRow.css'), 'utf8');

    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*640px\),\s*\(hover:\s*none\),\s*\(pointer:\s*coarse\)[\s\S]*?\.gantt-tr-dependencyPort\s*\{[\s\S]*?display:\s*none;[\s\S]*?pointer-events:\s*none;/,
    );
  });

  it('renders two visual connection ports on every task bar', () => {
    const tasks: Task[] = [
      { id: 'pred', name: 'Predecessor', startDate: '2026-03-02', endDate: '2026-03-04' },
      { id: 'succ', name: 'Successor', startDate: '2026-03-10', endDate: '2026-03-12' },
    ];

    const { container } = render(<GanttChart tasks={tasks} onTasksChange={vi.fn()} />);

    expect(container.querySelectorAll('[data-gantt-dependency-port]')).toHaveLength(4);
  });

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

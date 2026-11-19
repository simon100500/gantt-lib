// START_MODULE_CONTRACT
// PURPOSE: Verify native SimpleGrid task-list scheduling boundaries.
// SCOPE: Rectangular paste, controlled rejection, and shared tree visibility.
// INPUTS: User events on GanttChart.
// OUTPUTS: Atomic update or rejection and aligned tree visibility.
// END_MODULE_CONTRACT
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';
const tasks: Task[] = [
  { id: 'a', name: 'A', startDate: '2026-02-02', endDate: '2026-02-06' },
  { id: 'b', name: 'B', startDate: '2026-02-09', endDate: '2026-02-18' },
];
function paste(container: HTMLElement) {
  fireEvent.click(container.querySelector('[data-testid="sg-cell-0-name"]')!);
  fireEvent.paste(container.querySelector('[data-sg]')!, { clipboardData: { getData: () => 'Site\t2026-02-03\t2026-02-07\nFoundation\t2026-02-10\t2026-02-19' } });
}
describe('SimpleGrid inside GanttChart', () => {
  it('applies a rectangular paste once with both task changes', () => {
    const onTasksChange = vi.fn();
    const { container } = render(<GanttChart tasks={tasks} showTaskList businessDays={false} onTasksChange={onTasksChange} />);
    paste(container);
    expect(onTasksChange).toHaveBeenCalledTimes(1);
    expect(onTasksChange.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'a', name: 'Site', startDate: '2026-02-03', endDate: '2026-02-07' }),
      expect.objectContaining({ id: 'b', name: 'Foundation', startDate: '2026-02-10', endDate: '2026-02-19' }),
    ]));
  });
  it('routes one date through the existing controlled schedule intent', () => {
    const onScheduleIntent = vi.fn(); const onTasksChange = vi.fn();
    const { container } = render(<GanttChart tasks={tasks} showTaskList businessDays={false} onTasksChange={onTasksChange} onScheduleIntent={onScheduleIntent} />);
    fireEvent.click(container.querySelector('[data-testid="sg-cell-0-startDate"]')!);
    fireEvent.paste(container.querySelector('[data-sg]')!, { clipboardData: { getData: () => '03.02.2026' } });
    expect(onScheduleIntent).toHaveBeenCalledWith({ type: 'resize_task', taskId: 'a', anchor: 'end', date: '2026-02-03' });
    expect(onTasksChange).not.toHaveBeenCalled();
  });
  it('rejects a multi-date paste without emitting stale controlled intents', () => {
    const onTasksChange = vi.fn(); const onScheduleIntent = vi.fn();
    const { container } = render(<GanttChart tasks={tasks} showTaskList businessDays={false} onTasksChange={onTasksChange} onScheduleIntent={onScheduleIntent} />);
    paste(container);
    expect(onScheduleIntent).not.toHaveBeenCalled(); expect(onTasksChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Пакетное изменение дат');
  });
  it('collapses the same children from grid and chart', () => {
    const tree = [{ ...tasks[0], id: 'p', name: 'Parent' }, { ...tasks[1], parentId: 'p' }];
    const { container } = render(<GanttChart tasks={tree} showTaskList onTasksChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть Parent' }));
    expect(container.querySelectorAll('[data-testid^="sg-row-"]')).toHaveLength(1);
    // The surviving row is projected twice: the SimpleGrid row host in the task
    // list gutter and the chart bar row share the same task identity.
    expect(container.querySelectorAll('[data-gantt-task-row-id]')).toHaveLength(2);
  });
});

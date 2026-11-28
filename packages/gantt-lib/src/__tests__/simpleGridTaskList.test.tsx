// START_MODULE_CONTRACT
// PURPOSE: Verify native SimpleGrid task-list scheduling boundaries.
// SCOPE: Rectangular paste, controlled rejection, and shared tree visibility.
// INPUTS: User events on GanttChart.
// OUTPUTS: Atomic update or rejection and aligned tree visibility.
// END_MODULE_CONTRACT
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
  it('moves a collapsed subtree via the native grid gutter and preserves its hidden child', () => {
    const tree = [{ ...tasks[0], id: 'p', name: 'Parent' }, { ...tasks[0], parentId: 'p' }, tasks[1]];
    const onReorder = vi.fn();
    const { container } = render(<GanttChart tasks={tree} showTaskList collapsedParentIds={new Set(['p'])} onReorder={onReorder} />);
    const grid = screen.getByRole('grid', { name: 'Список задач' });
    const [parent, target] = within(grid).getAllByTestId(/^sg-row-\d+$/);
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 40, 600, 40));
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 80, 600, 40));
    fireEvent.mouseDown(parent.querySelector('[data-sg-row-drag-handle]')!, { button: 0, clientY: 60 });
    fireEvent.mouseMove(window, { clientY: 116 });
    expect(target).toHaveAttribute('data-sg-row-drop', 'after');
    fireEvent.mouseUp(window, { button: 0, clientY: 116 });
    expect(onReorder).toHaveBeenCalledOnce();
    const [ordered, moved, nextParent] = onReorder.mock.calls[0];
    expect(ordered.map((task: Task) => task.id)).toEqual(['b', 'p', 'a']);
    expect(ordered[2].parentId).toBe('p');
    expect([moved, nextParent]).toEqual(['p', undefined]);
    expect(container.querySelector('[data-sg-row-drop]')).toBeNull();
  });

  it('keeps the leaf duration edit on the scheduling intent path', () => {
    const onScheduleIntent = vi.fn();
    const onTasksChange = vi.fn();
    render(<GanttChart tasks={tasks} showTaskList businessDays={false} onScheduleIntent={onScheduleIntent} onTasksChange={onTasksChange} />);
    fireEvent.click(screen.getByTestId('sg-cell-0-duration'));
    const input = screen.getByRole('spinbutton', { name: 'Длительность' });
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onScheduleIntent).toHaveBeenCalledExactlyOnceWith({
      type: 'change_duration', taskId: 'a', duration: 7, anchor: 'start', taskType: 'task',
    });
    expect(onTasksChange).not.toHaveBeenCalled();
  });

  it('cascades a pasted progress value from a parent to its collapsed children', () => {
    const tree = [{ ...tasks[0], id: 'p', name: 'Parent', endDate: tasks[1].endDate }, { ...tasks[0], parentId: 'p' }, { ...tasks[1], parentId: 'p' }];
    const onTasksChange = vi.fn();
    render(<GanttChart tasks={tree} showTaskList collapsedParentIds={new Set(['p'])} onTasksChange={onTasksChange} />);
    fireEvent.click(screen.getByTestId('sg-cell-0-progress'));
    fireEvent.paste(screen.getByRole('grid', { name: 'Список задач' }), { clipboardData: { getData: () => '100' } });
    expect(onTasksChange).toHaveBeenCalledExactlyOnceWith(tree.map(task => ({ ...task, progress: 100 })));
  });

  it('leaves hidden selected tasks selected when a visible row is checked', () => {
    const tree = [{ ...tasks[0], id: 'p', name: 'Parent' }, { ...tasks[0], parentId: 'p' }, tasks[1]];
    const onSelectedTaskIdsChange = vi.fn();
    render(<GanttChart tasks={tree} showTaskList enableTaskMultiSelect collapsedParentIds={new Set(['p'])}
      selectedTaskIds={new Set(['a'])} onSelectedTaskIdsChange={onSelectedTaskIdsChange} />);
    fireEvent.click(within(screen.getByTestId('sg-rowheader-1')).getByRole('checkbox'));
    expect(onSelectedTaskIdsChange).toHaveBeenCalledExactlyOnceWith(new Set(['a', 'b']));
  });

  it('creates a dependency with the clicked row as the successor in the default pick mode', () => {
    const onTasksChange = vi.fn();
    const { container } = render(<GanttChart tasks={tasks} showTaskList businessDays={false} onTasksChange={onTasksChange} />);
    fireEvent.click(within(screen.getByTestId('sg-cell-0-dependencies')).getByRole('button', { name: 'Добавить связь' }));
    fireEvent.click(container.querySelector('[data-testid="sg-cell-1-dependencies"] .gantt-tl-cell-deps')!);
    expect(onTasksChange).toHaveBeenCalledOnce();
    expect(onTasksChange.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'b', dependencies: [{ taskId: 'a', type: 'FS', lag: 0 }] }),
    ]));
  });

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

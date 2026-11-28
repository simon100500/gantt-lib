// START_MODULE_CONTRACT
// PURPOSE: Verify native SimpleGrid task-list scheduling boundaries.
// SCOPE: Rectangular paste, controlled rejection, and shared tree visibility.
// INPUTS: User events on GanttChart.
// OUTPUTS: Atomic update or rejection and aligned tree visibility.
// END_MODULE_CONTRACT
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

function positionGridRows() {
  const rows = screen.getAllByTestId(/^sg-row-\d+$/);
  rows.forEach((row, index) => {
    vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 40 + index * 40, 600, 40));
  });
  return rows;
}

describe('SimpleGrid inside GanttChart', () => {
  it('adds a task by name and edits its estimate before either date is known', () => {
    function Project() {
      const [items, setItems] = React.useState<Task[]>([]);
      return <GanttChart tasks={items} showTaskList enableAddTask businessDays={false}
        onAdd={task => setItems([...items, task])}
        onTasksChange={updates => setItems(items.map(task => updates.find(update => update.id === task.id) ?? task))} />;
    }
    const { container } = render(<Project />);
    fireEvent.click(screen.getByRole('button', { name: /Добавить работу/ }));
    const name = screen.getByPlaceholderText('Название');
    fireEvent.change(name, { target: { value: 'Подготовка' } });
    fireEvent.keyDown(name, { key: 'Enter' });

    const start = screen.getByTestId('sg-cell-0-startDate');
    const end = screen.getByTestId('sg-cell-0-endDate');
    expect(start).toHaveTextContent('–');
    expect(end).toHaveTextContent('–');
    expect(screen.getByRole('button', { name: 'Назначить даты' })).toBeVisible();
    const duration = screen.getByTestId('sg-cell-0-duration');
    fireEvent.click(duration);
    fireEvent.keyDown(screen.getByRole('grid', { name: 'Список задач' }), { key: '7' });
    fireEvent.keyDown(within(duration).getByTestId('sg-editor-input'), { key: 'Enter' });
    expect(duration).toHaveTextContent('7 д');
    expect(start).toHaveTextContent('–');
    expect(end).toHaveTextContent('–');

    fireEvent.click(within(start).getByRole('button', { name: /Открыть календарь/ }));
    const calendar = screen.getByRole('dialog');
    const first = calendar.querySelector<HTMLButtonElement>('[data-day]:not([disabled])')!;
    const firstDate = first.dataset.day!;
    fireEvent.click(first);
    expect(container.querySelector('[data-open-edge="end"]')).toBeInTheDocument();
    expect(end).toHaveTextContent('–');
    expect(duration).toHaveTextContent('7 д');

    fireEvent.click(within(calendar).getByRole('button', { name: /^Окончание,/ }));
    const nextDate = new Date(firstDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 3);
    const nextDay = nextDate.toISOString().slice(0, 10);
    fireEvent.click(calendar.querySelector(`[data-day="${nextDay}"]`)!);
    expect(container.querySelector('.gantt-partial-task')).toBeNull();
    expect(duration).toHaveTextContent('4 д');

    fireEvent.click(within(calendar).getByRole('button', { name: /^Начало,/ }));
    fireEvent.click(within(calendar).getByRole('button', { name: 'Очистить дату' }));
    expect(container.querySelector('[data-open-edge="start"]')).toBeInTheDocument();
    expect(duration).toHaveTextContent('7 д');
  });

  it('assigns both dates from the timeline and keeps row dividers before scheduling', () => {
    function Project() {
      const [task, setTask] = React.useState<Task>({ id: 'draft', name: 'Разметка' });
      return <GanttChart tasks={[task]} businessDays={false} onTasksChange={([next]) => setTask(next)} />;
    }
    const { container } = render(<Project />);
    expect(container.querySelector('.gantt-incomplete-row[data-gantt-task-row-id="draft"]')).toHaveClass('gantt-tr-row');
    fireEvent.click(screen.getByRole('button', { name: 'Назначить даты' }));
    const calendar = screen.getByRole('dialog');
    const first = calendar.querySelector<HTMLButtonElement>('[data-day]:not([disabled])')!;
    const firstDate = first.dataset.day!;
    fireEvent.click(first);
    expect(screen.getByRole('dialog')).toBe(calendar);
    expect(within(calendar).getByRole('button', { name: /^Окончание,/ })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.gantt-incomplete-row[data-gantt-task-row-id="draft"]')).toHaveClass('gantt-tr-row');
    const nextDate = new Date(firstDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 3);
    fireEvent.click(calendar.querySelector(`[data-day="${nextDate.toISOString().slice(0, 10)}"]`)!);
    expect(container.querySelector('.gantt-incomplete-row')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each(['startDate', 'endDate'] as const)('moves only the known %s and displays a fixed marker when pinned', field => {
    const task = { id: 'partial', name: 'Открытая работа', [field]: '2026-02-10', durationDays: 3 };
    const onTasksChange = vi.fn();
    const { container, rerender } = render(<GanttChart tasks={[task]} onTasksChange={onTasksChange} dayWidth={30} businessDays={false} />);
    const bar = container.querySelector('.gantt-partial-task')!;
    const pointer = (type: string, x: number) => Object.assign(
      new MouseEvent(type, { bubbles: true, clientX: x }),
      { pointerId: 1, isPrimary: true },
    );
    fireEvent(bar, pointer('pointerdown', 60));
    fireEvent(bar, pointer('pointermove', 90));
    fireEvent(bar, pointer('pointerup', 90));
    expect(onTasksChange).toHaveBeenCalledOnce();
    expect(onTasksChange.mock.calls[0][0]).toMatchObject([{
      ...task, [field]: '2026-02-11', [field === 'startDate' ? 'endDate' : 'startDate']: undefined,
    }]);

    const fixed = field === 'startDate' ? 'fixedStartDate' : 'fixedEndDate';
    rerender(<GanttChart tasks={[{ ...task, [fixed]: '2026-02-10' }]} onTasksChange={onTasksChange} dayWidth={30} businessDays={false} />);
    expect(container.querySelector('.gantt-tr-fixedBoundary')).toBeInTheDocument();
    expect(bar).not.toHaveAttribute('data-movable');
  });

  it.each(['startDate', 'endDate'] as const)('moves dependency arrows during a drag of a %s-only bar and restores them on cancel', field => {
    const type = field === 'startDate' ? 'SS' : 'FF';
    const partial: Task = {
      id: 'partial', name: 'Open', [field]: '2026-02-10',
      dependencies: [{ taskId: 'a', type, lag: 0 }],
    };
    const onTasksChange = vi.fn();
    const { container } = render(<GanttChart tasks={[tasks[0], partial]}
      onTasksChange={onTasksChange} dayWidth={30} businessDays={false} />);
    const bar = container.querySelector<HTMLElement>('.gantt-partial-task')!;
    const position = () => bar.style.getPropertyValue('--gantt-partial-anchor');
    const path = () => container.querySelector('.gantt-dependency-path')?.getAttribute('d');
    const originalPath = path();
    const originalPosition = position();
    expect(originalPath).toBeTruthy();
    const pointer = (type: string, x: number) => Object.assign(
      new MouseEvent(type, { bubbles: true, clientX: x }),
      { pointerId: 1, isPrimary: true },
    );

    fireEvent(bar, pointer('pointerdown', 60));
    fireEvent(bar, pointer('pointermove', 90));
    expect(path()).not.toBe(originalPath);
    expect(parseFloat(position())).toBe(parseFloat(originalPosition) + 30);
    expect(onTasksChange).not.toHaveBeenCalled();
    fireEvent(bar, pointer('pointercancel', 90));
    expect(path()).toBe(originalPath);
    expect(position()).toBe(originalPosition);

    fireEvent(bar, pointer('pointerdown', 60));
    fireEvent(bar, pointer('pointermove', 90));
    fireEvent(bar, pointer('pointerup', 90));
    expect(onTasksChange).toHaveBeenCalledExactlyOnceWith([{
      ...partial, [field]: '2026-02-11',
      dependencies: [{ taskId: 'a', type, lag: field === 'startDate' ? 9 : 5 }],
    }]);
  });

  it('moves an open successor during a regular bar drag and commits its known date', async () => {
    const open: Task = {
      id: 'open', name: 'Открытая работа', startDate: '2026-02-07',
      dependencies: [{ taskId: 'a', type: 'FS', lag: 0 }],
    };
    const onTasksChange = vi.fn();
    const { container } = render(<GanttChart tasks={[tasks[0], open]} onTasksChange={onTasksChange}
      dayWidth={30} businessDays={false} />);
    const predecessor = container.querySelector<HTMLElement>('.gantt-tr-taskBar[data-taskbar]')!;
    const bar = container.querySelector<HTMLElement>('.gantt-partial-task')!;
    const position = () => parseFloat(bar.style.getPropertyValue('--gantt-partial-anchor'));
    const before = position();
    vi.spyOn(predecessor, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 150, 24));
    fireEvent.mouseDown(predecessor, { clientX: 75, button: 0 });
    fireEvent.mouseMove(window, { clientX: 105, buttons: 1 });
    await waitFor(() => expect(position()).toBe(before + 30));
    expect(onTasksChange).not.toHaveBeenCalled();
    fireEvent.mouseUp(window, { clientX: 105, button: 0 });
    expect(onTasksChange).toHaveBeenCalledOnce();
    expect(onTasksChange.mock.calls[0][0]).toContainEqual(expect.objectContaining({
      id: 'open', startDate: '2026-02-08', endDate: undefined,
    }));
  });

  it('moves a collapsed subtree via the native grid gutter and preserves its hidden child', () => {
    const tree = [{ ...tasks[0], id: 'p', name: 'Parent' }, { ...tasks[0], parentId: 'p' }, tasks[1]];
    const onReorder = vi.fn();
    const { container } = render(<GanttChart tasks={tree} showTaskList collapsedParentIds={new Set(['p'])} onReorder={onReorder} />);
    const [parent, target] = positionGridRows();
    fireEvent.mouseDown(parent.querySelector('[data-sg-row-drag-handle]')!, { button: 0, clientY: 60 });
    fireEvent.mouseMove(window, { clientY: 116 });
    expect(target).toHaveAttribute('data-sg-row-drop', 'end');
    fireEvent.mouseUp(window, { button: 0, clientY: 116 });
    expect(onReorder).toHaveBeenCalledOnce();
    const [ordered, moved, nextParent] = onReorder.mock.calls[0];
    expect(ordered.map((task: Task) => task.id)).toEqual(['b', 'p', 'a']);
    expect(ordered[2].parentId).toBe('p');
    expect([moved, nextParent]).toEqual(['p', undefined]);
    expect(container.querySelector('[data-sg-row-drop]')).toBeNull();
  });

  it.each([118, 122])('uses the same gap target and parent on either side of y=120 (released at %s)', dropY => {
    const tree = [
      { ...tasks[0], id: 'p', name: 'Parent' }, { ...tasks[0], parentId: 'p' },
      tasks[1], { ...tasks[1], id: 'c', name: 'Moved' },
    ];
    const onReorder = vi.fn();
    render(<GanttChart tasks={tree} showTaskList onReorder={onReorder} />);
    const [, lastChild, nextRoot, moved] = positionGridRows();
    fireEvent.mouseDown(moved.querySelector('[data-sg-row-drag-handle]')!, { button: 0, clientY: 180 });
    for (const clientY of [118, 122]) {
      fireEvent.mouseMove(window, { clientY });
      expect(lastChild).not.toHaveAttribute('data-sg-row-drop');
      expect(nextRoot).toHaveAttribute('data-sg-row-drop', 'before');
    }
    fireEvent.mouseUp(window, { button: 0, clientY: dropY });
    expect(onReorder).toHaveBeenCalledOnce();
    const [ordered, movedId, nextParent] = onReorder.mock.calls[0];
    expect(ordered.map((task: Task) => task.id)).toEqual(['p', 'a', 'c', 'b']);
    expect([movedId, nextParent]).toEqual(['c', undefined]);
  });

  it.each([false, true])('nests the dragged row when hovering the middle of the target (collapsed group: %s)', isGroup => {
    const tree = isGroup
      ? [tasks[1], { ...tasks[0], id: 'child', parentId: 'b' }, tasks[0]]
      : [tasks[1], tasks[0]];
    const onReorder = vi.fn();
    render(<GanttChart tasks={tree} showTaskList onReorder={onReorder}
      collapsedParentIds={isGroup ? new Set(['b']) : undefined} />);
    const [target, moved] = positionGridRows();
    fireEvent.mouseDown(moved.querySelector('[data-sg-row-drag-handle]')!, { button: 0, clientY: 100 });
    fireEvent.mouseMove(window, { clientY: 60 });
    expect(target).toHaveAttribute('data-sg-row-drop', 'inside');
    fireEvent.mouseUp(window, { button: 0, clientY: 60 });
    expect(onReorder).toHaveBeenCalledOnce();
    const [ordered, movedId, nextParent] = onReorder.mock.calls[0];
    expect(ordered.map((task: Task) => task.id)).toEqual(isGroup ? ['b', 'child', 'a'] : ['b', 'a']);
    expect([movedId, nextParent]).toEqual(['a', 'b']);
    expect(ordered.at(-1).parentId).toBe('b');
  });

  it('selects duration on click and routes native keyboard edits through the scheduling intent', () => {
    const onScheduleIntent = vi.fn();
    const onTasksChange = vi.fn();
    render(<GanttChart tasks={tasks} showTaskList businessDays={false} onScheduleIntent={onScheduleIntent} onTasksChange={onTasksChange} />);
    const cell = screen.getByTestId('sg-cell-0-duration');
    fireEvent.click(cell);
    expect(cell).toHaveAttribute('data-active', 'true');
    expect(within(cell).queryByTestId('sg-editor-input')).toBeNull();
    fireEvent.keyDown(screen.getByRole('grid', { name: 'Список задач' }), { key: '7' });
    const editor = within(cell).getByTestId('sg-editor-input');
    expect(editor).toHaveAttribute('contenteditable');
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(onScheduleIntent).toHaveBeenCalledExactlyOnceWith({
      type: 'change_duration', taskId: 'a', duration: 7, anchor: 'start', taskType: 'task',
    });
    expect(onTasksChange).not.toHaveBeenCalled();
  });

  it('edits progress as native cell text', () => {
    const onTasksChange = vi.fn();
    render(<GanttChart tasks={tasks} showTaskList onTasksChange={onTasksChange} />);
    const cell = screen.getByTestId('sg-cell-0-progress');
    fireEvent.click(cell);
    fireEvent.keyDown(screen.getByRole('grid', { name: 'Список задач' }), { key: '7' });
    const editor = within(cell).getByTestId('sg-editor-input');
    expect(editor).toHaveAttribute('contenteditable', 'true');
    editor.textContent = '70';
    fireEvent.input(editor);
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(onTasksChange).toHaveBeenCalledExactlyOnceWith([{ ...tasks[0], progress: 70 }]);
  });

  it('edits and pastes additional text columns through the grid', () => {
    const ownedTasks = tasks.map(task => ({ ...task, owner: 'Ким' }));
    const onTasksChange = vi.fn();
    render(<GanttChart tasks={ownedTasks} showTaskList onTasksChange={onTasksChange} additionalColumns={[{
      id: 'owner', header: 'Ответственный', editable: true,
      renderCell: ({ task }) => task.owner,
      textEditor: { getValue: task => task.owner, setValue: (_, owner) => ({ owner }) },
    }]} />);
    const grid = screen.getByRole('grid', { name: 'Список задач' });
    const cell = screen.getByTestId('sg-cell-0-owner');
    fireEvent.click(cell);
    fireEvent.keyDown(grid, { key: 'Enter' });
    const editor = within(cell).getByTestId('sg-editor-input');
    expect(editor).toHaveAttribute('contenteditable', 'true');
    expect(editor).toHaveTextContent('Ким');
    editor.textContent = 'Орлов';
    fireEvent.input(editor);
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(onTasksChange).toHaveBeenCalledExactlyOnceWith([{ ...ownedTasks[0], owner: 'Орлов' }]);

    onTasksChange.mockClear();
    fireEvent.click(cell);
    fireEvent.paste(grid, { clipboardData: { getData: () => 'Орлов\nЛебедева' } });
    expect(onTasksChange).toHaveBeenCalledExactlyOnceWith([
      { ...ownedTasks[0], owner: 'Орлов' },
      { ...ownedTasks[1], owner: 'Лебедева' },
    ]);
  });

  it('scrolls to a clicked task name and opens its inline menu without scrolling again', () => {
    const onSelect = vi.fn();
    const { container } = render(<GanttChart tasks={tasks} showTaskList dayWidth={25}
      dateRange={{ start: new Date('2026-02-02'), end: new Date('2026-02-28') }}
      taskListMenuCommands={[{ id: 'details', label: 'Детали', onSelect }]} />);
    const scrollTo = vi.fn();
    Object.defineProperty(container.querySelector('.gantt-scrollContainer')!, 'scrollTo', { value: scrollTo });

    expect(screen.queryByTestId('sg-colheader-actions')).toBeNull();
    const nameCell = screen.getByTestId('sg-cell-1-name');
    fireEvent.click(nameCell);
    expect(nameCell).toHaveAttribute('data-active', 'true');
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 125, behavior: 'smooth' });

    const menuTrigger = within(nameCell).getByRole('button', { name: 'Действия: B' });
    fireEvent.click(menuTrigger);
    fireEvent.click(screen.getByRole('button', { name: 'Детали' }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'b' }));
    expect(scrollTo).toHaveBeenCalledOnce();
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

  it.each([
    [{ startDate: '2026-02-10' }, { startDate: '2026-02-07', endDate: undefined }],
    [{ endDate: '2026-02-10' }, { startDate: undefined, endDate: '2026-02-10' }],
  ])('adds a table link while preserving open dates (%j)', (bounds, expected) => {
    const items: Task[] = [
      { id: 'a', name: 'A', endDate: '2026-02-06' },
      { id: 'b', name: 'B', ...bounds },
    ];
    const onTasksChange = vi.fn();
    const { container } = render(<GanttChart tasks={items} showTaskList businessDays={false} onTasksChange={onTasksChange} />);
    fireEvent.click(within(screen.getByTestId('sg-cell-0-dependencies')).getByRole('button', { name: 'Добавить связь' }));
    fireEvent.click(container.querySelector('[data-testid="sg-cell-1-dependencies"] .gantt-tl-cell-deps')!);
    expect(onTasksChange).toHaveBeenCalledOnce();
    expect(onTasksChange.mock.calls[0][0]).toMatchObject([{
      id: 'b', ...expected, dependencies: [{ taskId: 'a', type: 'FS', lag: 0 }],
    }]);
  });

  it('persists a link before requesting a schedule update for a single known date', () => {
    const items: Task[] = [
      { id: 'a', name: 'A', endDate: '2026-02-06' },
      { id: 'b', name: 'B', startDate: '2026-02-10' },
    ];
    const onTasksChange = vi.fn();
    const onScheduleIntent = vi.fn();
    const { container } = render(<GanttChart tasks={items} showTaskList businessDays={false}
      onTasksChange={onTasksChange} onScheduleIntent={onScheduleIntent} />);
    fireEvent.click(within(screen.getByTestId('sg-cell-0-dependencies')).getByRole('button', { name: 'Добавить связь' }));
    fireEvent.click(container.querySelector('[data-testid="sg-cell-1-dependencies"] .gantt-tl-cell-deps')!);
    expect(onTasksChange).toHaveBeenCalledOnce();
    expect(onTasksChange.mock.calls[0][0]).toMatchObject([{
      id: 'b', startDate: '2026-02-10', endDate: undefined, dependencies: [{ taskId: 'a', type: 'FS', lag: 0 }],
    }]);
    expect(onScheduleIntent).toHaveBeenCalledExactlyOnceWith({
      type: 'resize_task', taskId: 'b', anchor: 'end', date: '2026-02-07',
    });
    expect(onTasksChange.mock.invocationCallOrder[0]).toBeLessThan(onScheduleIntent.mock.invocationCallOrder[0]);
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

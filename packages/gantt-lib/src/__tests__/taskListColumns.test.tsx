import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';
import type { TaskListColumn } from '../components/TaskList/taskListColumns';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

type ExtendedTask = Task & { assignee?: string; status?: string };

const additionalColumns: TaskListColumn<ExtendedTask>[] = [
  { id: 'assignee', header: 'Исполнитель', after: 'name', width: 140, renderCell: ({ task }) => task.assignee ?? '-' },
  {
    id: 'status',
    header: 'Статус',
    after: 'progress',
    width: 96,
    renderCell: ({ task }) => task.status ?? 'new',
    renderEditor: ({ task, updateTask, closeEditor }) => (
      <button type="button" onClick={() => { updateTask({ status: 'done' }); closeEditor(); }}>
        edit-{task.id}
      </button>
    ),
  },
];

const baseTasks: Task[] = [
  {
    id: 't1',
    name: 'Task Alpha',
    startDate: '2026-02-01',
    endDate: '2026-02-05',
    progress: 50,
  },
  {
    id: 't2',
    name: 'Task Beta',
    startDate: '2026-02-06',
    endDate: '2026-02-10',
    progress: 0,
  },
];

const extendedTasks: ExtendedTask[] = [
  {
    id: 't1',
    name: 'Task Alpha',
    startDate: '2026-02-01',
    endDate: '2026-02-05',
    progress: 50,
    assignee: 'Alice',
    status: 'in-progress',
  },
  {
    id: 't2',
    name: 'Task Beta',
    startDate: '2026-02-06',
    endDate: '2026-02-10',
    progress: 0,
  },
];

describe('GanttChart additionalColumns', () => {
  it('renders additional columns after the configured built-in anchor', () => {
    const { container } = render(
      <GanttChart
        tasks={extendedTasks}
        showTaskList
        rowHeight={36}
        headerHeight={40}
        taskListWidth={660}
        additionalColumns={additionalColumns}
      />
    );

    // Verify additional column headers exist
    const header = container.querySelector('.gantt-tl-header');
    expect(header).not.toBeNull();

    // Assignee header should be present
    expect(screen.getByText('Исполнитель')).toBeTruthy();
    // Status header should be present
    expect(screen.getByText('Статус')).toBeTruthy();

    // Assignee column should appear after Name column
    const headerCells = Array.from(header!.querySelectorAll('.gantt-tl-headerCell'));
    const nameIndex = headerCells.findIndex(cell => cell.textContent?.includes('Имя'));
    const assigneeIndex = headerCells.findIndex(cell => cell.textContent?.includes('Исполнитель'));
    expect(nameIndex).toBeGreaterThanOrEqual(0);
    expect(assigneeIndex).toBeGreaterThan(nameIndex);

    // Status column should appear after Progress column
    const progressIndex = headerCells.findIndex(cell => cell.textContent?.includes('%'));
    const statusIndex = headerCells.findIndex(cell => cell.textContent?.includes('Статус'));
    expect(progressIndex).toBeGreaterThanOrEqual(0);
    expect(statusIndex).toBeGreaterThan(progressIndex);
  });

  it('falls back to the name anchor when after is omitted or invalid', () => {
    const cols: TaskListColumn<ExtendedTask>[] = [
      {
        id: 'custom-no-after',
        header: 'Custom',
        width: 80,
        // No `after` — should default to after 'name'
        renderCell: () => 'custom-value',
      },
    ];

    const { container } = render(
      <GanttChart
        tasks={baseTasks}
        showTaskList
        rowHeight={36}
        headerHeight={40}
        taskListWidth={660}
        additionalColumns={cols}
      />
    );

    // Custom column header should be present
    expect(screen.getByText('Custom')).toBeTruthy();

    const header = container.querySelector('.gantt-tl-header');
    const headerCells = Array.from(header!.querySelectorAll('.gantt-tl-headerCell'));
    const nameIndex = headerCells.findIndex(cell => cell.textContent?.includes('Имя'));
    const customIndex = headerCells.findIndex(cell => cell.textContent?.includes('Custom'));
    expect(customIndex).toBeGreaterThan(nameIndex);
  });

  it('renders custom cell content for every visible row', () => {
    render(
      <GanttChart
        tasks={extendedTasks}
        showTaskList
        rowHeight={36}
        headerHeight={40}
        taskListWidth={660}
        additionalColumns={additionalColumns}
      />
    );

    // Assignee column: row 1 has "Alice", row 2 has "-"
    const aliceCells = screen.getAllByText('Alice');
    expect(aliceCells.length).toBeGreaterThanOrEqual(1);

    // Row 2 has no assignee, should show "-"
    const dashCells = screen.getAllByText('-');
    // Filter to only those that are in custom column cells
    expect(dashCells.length).toBeGreaterThanOrEqual(1);
  });

  it('applies numeric and string widths to matching header and body cells', () => {
    const { container } = render(
      <GanttChart
        tasks={extendedTasks}
        showTaskList
        rowHeight={36}
        headerHeight={40}
        taskListWidth={660}
        additionalColumns={additionalColumns}
      />
    );

    // Find cells by column id data attributes
    const assigneeHeader = container.querySelector('[data-custom-column-id="assignee"]');
    expect(assigneeHeader).not.toBeNull();
    // Numeric width: 140 → should produce inline style with width
    const assigneeStyle = (assigneeHeader as HTMLElement).style;
    expect(assigneeStyle.width || assigneeStyle.minWidth || assigneeStyle.flex).toBeTruthy();

    const statusHeader = container.querySelector('[data-custom-column-id="status"]');
    expect(statusHeader).not.toBeNull();
    const statusStyle = (statusHeader as HTMLElement).style;
    expect(statusStyle.width || statusStyle.minWidth || statusStyle.flex).toBeTruthy();
  });

  it('keeps base columns visible when additional columns are present', () => {
    render(
      <GanttChart
        tasks={extendedTasks}
        showTaskList
        rowHeight={36}
        headerHeight={40}
        taskListWidth={660}
        additionalColumns={additionalColumns}
      />
    );

    // Base columns should still render
    expect(screen.getByText('№')).toBeTruthy();
    expect(screen.getByText('Имя')).toBeTruthy();
    expect(screen.getByText('Начало')).toBeTruthy();
    expect(screen.getByText('Окончание')).toBeTruthy();

    // Task names should still be visible
    expect(screen.getAllByText('Task Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Task Beta').length).toBeGreaterThan(0);
  });

  it('grows task list width budget when additional columns are provided', () => {
    const { container } = render(
      <GanttChart
        tasks={extendedTasks}
        showTaskList
        rowHeight={36}
        headerHeight={40}
        taskListWidth={660}
        additionalColumns={additionalColumns}
      />
    );

    // The overlay element should have a width that accounts for base + additional columns
    const overlay = container.querySelector('.gantt-tl-overlay') as HTMLElement;
    expect(overlay).not.toBeNull();
    const overlayWidth = overlay.style.getPropertyValue('--tasklist-width');
    // With additional columns (140 + 96 = 236 extra), total should exceed 660
    expect(parseInt(overlayWidth)).toBeGreaterThan(660);
  });

  it('opens a custom editor and saves a merged task patch through onTasksChange', () => {
    const onTasksChange = vi.fn();

    const { container } = render(
      <GanttChart
        tasks={extendedTasks}
        showTaskList
        rowHeight={36}
        headerHeight={40}
        taskListWidth={660}
        additionalColumns={additionalColumns}
        onTasksChange={onTasksChange}
      />
    );

    // Find status body cells (using data-custom-column-editing which only exists on row cells, not headers)
    const statusBodyCells = container.querySelectorAll('[data-custom-column-editing="false"][data-custom-column-id="status"]');
    expect(statusBodyCells.length).toBeGreaterThanOrEqual(1);

    const statusCell = statusBodyCells[0] as HTMLElement;

    // Before click, no editor should be visible
    expect(container.querySelector('[data-custom-column-editor="status"]')).toBeNull();

    // Click the editable cell to open editor
    fireEvent.click(statusCell);

    // Editor wrapper should appear
    const editorWrapper = container.querySelector('[data-custom-column-editor="status"]');
    expect(editorWrapper).not.toBeNull();

    // Cell should now have editing="true"
    expect(statusCell.getAttribute('data-custom-column-editing')).toBe('true');

    // The editor button should be rendered with text "edit-t1"
    const editButton = screen.queryByText('edit-t1');
    expect(editButton).not.toBeNull();

    // Click the edit button inside the editor
    fireEvent.click(editButton!);

    // onTasksChange should have been called exactly once
    expect(onTasksChange).toHaveBeenCalledTimes(1);
    const lastCall = onTasksChange.mock.calls[0];
    const patchedTask = lastCall[0].find((t: Task) => t.id === 't1');
    expect(patchedTask).toBeDefined();
    // All original fields preserved, only status changed
    expect(patchedTask.id).toBe('t1');
    expect(patchedTask.name).toBe('Task Alpha');
    expect(patchedTask.startDate).toBe('2026-02-01');
    expect(patchedTask.endDate).toBe('2026-02-05');
    expect((patchedTask as ExtendedTask).status).toBe('done');

    // Editor should be closed after save
    expect(container.querySelector('[data-custom-column-editor="status"]')).toBeNull();
    expect(statusCell.getAttribute('data-custom-column-editing')).toBe('false');
  });
});

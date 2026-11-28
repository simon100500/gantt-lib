// START_MODULE_CONTRACT
// PURPOSE: Verify Gantt task-list checkbox selection through the rendered chart.
// SCOPE: Individual rows, visible Shift ranges through collapsed branches, and the header checkbox.
// INPUTS: Task hierarchies, collapse state and checkbox clicks.
// OUTPUTS: Checked rows and emitted selection IDs.
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

const tasks: Task[] = [
  {
    id: 'task-1',
    name: 'Task Alpha',
    startDate: '2026-02-01',
    endDate: '2026-02-05',
  },
  {
    id: 'task-2',
    name: 'Task Beta',
    startDate: '2026-02-06',
    endDate: '2026-02-10',
  },
];

describe('GanttChart task multi-select', () => {
  it('does not render selection checkboxes until multi-select mode is enabled', () => {
    const { container } = render(
      <GanttChart
        tasks={tasks}
        showTaskList
      />
    );

    expect(container.querySelector('[data-column-id="selection"]')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /выбрать работу task alpha/i })).toBeNull();
  });

  it('selects and unselects individual rows through the leading checkbox column', () => {
    const onSelectedTaskIdsChange = vi.fn();

    render(
      <GanttChart
        tasks={tasks}
        showTaskList
        enableTaskMultiSelect
        onSelectedTaskIdsChange={onSelectedTaskIdsChange}
      />
    );

    const alphaCheckbox = screen.getByRole('checkbox', { name: /выбрать работу 1\. task alpha/i });
    fireEvent.click(alphaCheckbox);

    expect((alphaCheckbox as HTMLInputElement).checked).toBe(true);
    expect(Array.from(onSelectedTaskIdsChange.mock.calls.at(-1)?.[0] ?? [])).toEqual(['task-1']);

    fireEvent.click(alphaCheckbox);

    expect((alphaCheckbox as HTMLInputElement).checked).toBe(false);
    expect(Array.from(onSelectedTaskIdsChange.mock.calls.at(-1)?.[0] ?? [])).toEqual([]);
  });

  it('toggles all visible rows from the header checkbox', () => {
    const onSelectedTaskIdsChange = vi.fn();

    render(
      <GanttChart
        tasks={tasks}
        showTaskList
        enableTaskMultiSelect
        onSelectedTaskIdsChange={onSelectedTaskIdsChange}
      />
    );

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /выбрать все видимые работы/i });
    fireEvent.click(selectAllCheckbox);

    expect((selectAllCheckbox as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /task alpha/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /task beta/i }) as HTMLInputElement).checked).toBe(true);
    expect(Array.from(onSelectedTaskIdsChange.mock.calls.at(-1)?.[0] ?? [])).toEqual(['task-1', 'task-2']);

    fireEvent.click(selectAllCheckbox);

    expect((selectAllCheckbox as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('checkbox', { name: /task alpha/i }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('checkbox', { name: /task beta/i }) as HTMLInputElement).checked).toBe(false);
    expect(Array.from(onSelectedTaskIdsChange.mock.calls.at(-1)?.[0] ?? [])).toEqual([]);
  });

  it('reflects controlled selected task IDs', () => {
    render(
      <GanttChart
        tasks={tasks}
        showTaskList
        enableTaskMultiSelect
        selectedTaskIds={new Set(['task-2'])}
      />
    );

    expect((screen.getByRole('checkbox', { name: /task alpha/i }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('checkbox', { name: /task beta/i }) as HTMLInputElement).checked).toBe(true);
  });

  it('selects and clears a Shift range in visible order across a collapsed section', () => {
    const onSelectedTaskIdsChange = vi.fn();
    const rows = [
      ...tasks,
      { ...tasks[0], id: 'hidden', name: 'Hidden child', parentId: 'task-2' },
      { ...tasks[1], id: 'last', name: 'Last row' },
    ];
    render(
      <GanttChart
        tasks={rows}
        showTaskList
        enableTaskMultiSelect
        collapsedParentIds={new Set(['task-2'])}
        onSelectedTaskIdsChange={onSelectedTaskIdsChange}
      />,
    );

    const first = screen.getByRole('checkbox', { name: /task alpha/i });
    const last = screen.getByRole('checkbox', { name: /last row/i });
    fireEvent.click(last);
    fireEvent.click(first, { shiftKey: true });
    expect(onSelectedTaskIdsChange).toHaveBeenLastCalledWith(new Set(['last', 'task-1', 'task-2']));
    expect(screen.queryByRole('checkbox', { name: /hidden child/i })).toBeNull();
    fireEvent.click(first, { shiftKey: true });
    expect(onSelectedTaskIdsChange).toHaveBeenLastCalledWith(new Set());
  });
});


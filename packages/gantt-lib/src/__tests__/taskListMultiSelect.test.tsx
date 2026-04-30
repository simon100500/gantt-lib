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
    expect(screen.queryByRole('checkbox', { name: /выбрать задачу task alpha/i })).toBeNull();
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

    const alphaCheckbox = screen.getByRole('checkbox', { name: /выбрать задачу 1\. task alpha/i });
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

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /выбрать все видимые задачи/i });
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
});

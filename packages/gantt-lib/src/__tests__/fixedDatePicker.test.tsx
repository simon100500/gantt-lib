// START_MODULE_CONTRACT
// PURPOSE: Verify real date pickers for fixed task boundaries.
// SCOPE: Explicit apply, pin toggling, duration modes, cancellation, validation, exact dates and milestones.
// INPUTS: Anchored tasks and real chart controls with observed host callbacks.
// OUTPUTS: Field-only edits for valid dates and no mutations from invalid or discarded drafts.
// END_MODULE_CONTRACT
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: () => {} });

const task: Task = {
  id: 'section', name: 'Секция', startDate: '2026-10-05', endDate: '2026-10-09',
  fixedStartDate: '2026-10-05', fixedEndDate: '2026-10-09',
};
const child: Task = {
  id: 'child', parentId: task.id, name: 'Работа', startDate: '2026-10-05', endDate: '2026-10-09',
};

function dateTriggers(container: HTMLElement) {
  return container.querySelectorAll<HTMLButtonElement>('[data-testid="sg-row-0"] .sg-calendar-trigger');
}

async function openDate(trigger: HTMLButtonElement) {
  fireEvent.click(trigger);
  const picker = within(await screen.findByRole('dialog'));
  expect(picker.queryByRole('textbox')).toBeNull();
  return picker;
}

it.each([
  { column: 0, label: 'Закреплённое начало', changed: { fixedStartDate: '2026-10-06' } },
  { column: 1, label: 'Закреплённое окончание', changed: { fixedEndDate: '2026-10-10' } },
])('applies a field-only change for $label after explicit confirmation', async ({ column, label, changed }) => {
  const onTasksChange = vi.fn();
  const onScheduleIntent = vi.fn();
  const { container } = render(<GanttChart
    tasks={[task, child]}
    showTaskList
    businessDays={false}
    taskDateChangeMode="free"
    onTasksChange={onTasksChange}
    onScheduleIntent={onScheduleIntent}
  />);
  const picker = await openDate(dateTriggers(container)[column]!);
  expect(picker.getByText(label)).toBeTruthy();
  fireEvent.click(picker.getByRole('button', { name: '+1' }));
  expect(onTasksChange).not.toHaveBeenCalled();
  fireEvent.click(picker.getByRole('button', { name: 'Применить' }));
  expect(onTasksChange).toHaveBeenCalledExactlyOnceWith([expect.objectContaining({ ...task, ...changed })]);
  expect(onScheduleIntent).not.toHaveBeenCalled();
});

it('keeps the picker open on a conflicting date and discards the draft on Escape', async () => {
  const onTasksChange = vi.fn();
  const { container } = render(<GanttChart tasks={[task]} showTaskList businessDays={false} taskDateChangeMode="free" onTasksChange={onTasksChange} />);
  const trigger = dateTriggers(container)[0]!;
  const picker = await openDate(trigger);
  fireEvent.click(picker.getByRole('button', { name: '+7' }));
  fireEvent.click(picker.getByRole('button', { name: 'Применить' }));
  expect(picker.getByRole('alert').textContent).toBe('Начало позже закреплённого окончания.');
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  const reopened = await openDate(trigger);
  expect(screen.getByRole('dialog').querySelector('[aria-pressed="true"]')?.getAttribute('data-day')).toBe('2026-10-05');
  expect(reopened.queryByRole('alert')).toBeNull();
  expect(onTasksChange).not.toHaveBeenCalled();
});

it('applies one exact calendar date to both existing anchors of a milestone', async () => {
  const milestone: Task = {
    ...task, type: 'milestone', endDate: task.startDate, fixedEndDate: task.fixedStartDate,
  };
  const onTasksChange = vi.fn();
  const { container } = render(<GanttChart tasks={[milestone]} showTaskList businessDays onTasksChange={onTasksChange} />);
  const picker = await openDate(dateTriggers(container)[1]!);
  expect(picker.getByText('Закреплённая дата вехи')).toBeTruthy();
  const saturday = screen.getByRole('dialog').querySelector<HTMLButtonElement>('[data-day="2026-10-10"]')!;
  fireEvent.click(saturday);
  expect(saturday.getAttribute('aria-pressed')).toBe('true');
  expect(onTasksChange).not.toHaveBeenCalled();
  fireEvent.click(picker.getByRole('button', { name: 'Применить' }));
  expect(onTasksChange).toHaveBeenCalledExactlyOnceWith([expect.objectContaining({
    ...milestone, fixedStartDate: '2026-10-10', fixedEndDate: '2026-10-10',
  })]);
});

it('disables an anchored picker when the chart has only a scheduling callback', () => {
  const { container } = render(<GanttChart tasks={[task]} showTaskList onScheduleIntent={vi.fn()} />);
  expect(dateTriggers(container)).toHaveLength(0);
});

it('validates and commits a pinned boundary from the cell editor', () => {
  const onTasksChange = vi.fn();
  const onScheduleIntent = vi.fn();
  render(<GanttChart tasks={[task]} showTaskList businessDays={false} taskDateChangeMode="free"
    onTasksChange={onTasksChange} onScheduleIntent={onScheduleIntent} />);
  const cell = screen.getByTestId('sg-cell-0-startDate');
  fireEvent.click(cell);
  fireEvent.keyDown(screen.getByRole('grid', { name: 'Список задач' }), { key: 'Enter' });
  const editor = within(cell).getByTestId('sg-editor-input');
  editor.textContent = '12.10.2026';
  fireEvent.input(editor);
  fireEvent.keyDown(editor, { key: 'Enter' });
  expect(within(cell).getByRole('alert').textContent).toBe('Начало позже закреплённого окончания.');
  expect(onTasksChange).not.toHaveBeenCalled();
  editor.textContent = '06.10.2026';
  fireEvent.input(editor);
  fireEvent.keyDown(editor, { key: 'Enter' });
  expect(onTasksChange).toHaveBeenCalledExactlyOnceWith([expect.objectContaining({ ...task, fixedStartDate: '2026-10-06' })]);
  expect(onScheduleIntent).not.toHaveBeenCalled();
});

it('shows the duration checkbox and shifts both existing anchors when it is on', async () => {
  const onTasksChange = vi.fn();
  const { container } = render(<GanttChart tasks={[task]} showTaskList businessDays={false} onTasksChange={onTasksChange} />);
  const picker = await openDate(dateTriggers(container)[0]!);
  expect((picker.getByRole('checkbox', { name: 'Сохранять длительность' }) as HTMLInputElement).checked).toBe(true);
  expect(picker.getByText('Обе закреплённые даты сдвинутся.')).toBeTruthy();
  fireEvent.click(picker.getByRole('button', { name: '+1' }));
  fireEvent.click(picker.getByRole('button', { name: 'Применить' }));
  expect(onTasksChange).toHaveBeenCalledExactlyOnceWith([expect.objectContaining({
    fixedStartDate: '2026-10-06', fixedEndDate: '2026-10-10',
  })]);
});

it.each([
  { existing: '2026-10-05', label: 'Снять закрепление', expected: null },
  { existing: null, label: 'Закрепить текущую дату', expected: '2026-10-05' },
])('toggles a pin via $label without changing the other boundary', async ({ existing, label, expected }) => {
  const onTasksChange = vi.fn();
  const row = { ...task, fixedStartDate: existing };
  const { container } = render(<GanttChart tasks={[row]} showTaskList onTasksChange={onTasksChange} />);
  const picker = await openDate(dateTriggers(container)[0]!);
  fireEvent.click(picker.getByRole('button', { name: label }));
  expect(onTasksChange).toHaveBeenCalledExactlyOnceWith([expect.objectContaining({ ...row, fixedStartDate: expected })]);
});

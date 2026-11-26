// START_MODULE_CONTRACT
// PURPOSE: Verify real date pickers for fixed task boundaries.
// SCOPE: Explicit apply, keyboard cancellation, range validation, exact calendar dates and milestones.
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
  return container.querySelectorAll<HTMLButtonElement>('.gantt-tl-row:first-child .gantt-datepicker-trigger');
}

async function openDate(trigger: HTMLButtonElement) {
  fireEvent.click(trigger);
  return within(await screen.findByRole('dialog'));
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
    onTasksChange={onTasksChange}
    onScheduleIntent={onScheduleIntent}
  />);
  const picker = await openDate(dateTriggers(container)[column]!);
  expect(picker.getByText(label)).toBeTruthy();
  fireEvent.click(picker.getByRole('button', { name: '+1' }));
  fireEvent.blur(picker.getByRole('textbox', { name: label }));
  expect(onTasksChange).not.toHaveBeenCalled();
  fireEvent.click(picker.getByRole('button', { name: 'Применить' }));
  expect(onTasksChange).toHaveBeenCalledExactlyOnceWith([expect.objectContaining({ ...task, ...changed })]);
  expect(onScheduleIntent).not.toHaveBeenCalled();
});

it('keeps the picker open on a conflicting date and discards the draft on Escape', async () => {
  const onTasksChange = vi.fn();
  const { container } = render(<GanttChart tasks={[task]} showTaskList businessDays={false} onTasksChange={onTasksChange} />);
  const trigger = dateTriggers(container)[0]!;
  const picker = await openDate(trigger);
  fireEvent.keyDown(picker.getByRole('textbox'), { key: 'Backspace' });
  fireEvent.click(picker.getByRole('button', { name: 'Применить' }));
  expect(picker.getByRole('alert').textContent).toBe('Введите корректную дату.');
  fireEvent.click(picker.getByRole('button', { name: '+7' }));
  fireEvent.click(picker.getByRole('button', { name: 'Применить' }));
  expect(picker.getByRole('alert').textContent).toBe('Начало позже закреплённого окончания.');
  fireEvent.keyDown(picker.getByRole('textbox'), { key: 'Escape' });
  const reopened = await openDate(trigger);
  expect(reopened.getByDisplayValue('05.10.26')).toBeTruthy();
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
  const october = screen.getByRole('dialog').querySelector<HTMLElement>('[data-month="2026-10"]')!;
  fireEvent.click(within(october).getByRole('button', { name: '10' }));
  expect(picker.getByDisplayValue('10.10.26')).toBeTruthy();
  expect(onTasksChange).not.toHaveBeenCalled();
  fireEvent.keyDown(picker.getByRole('textbox'), { key: 'Enter' });
  expect(onTasksChange).toHaveBeenCalledExactlyOnceWith([expect.objectContaining({
    ...milestone, fixedStartDate: '2026-10-10', fixedEndDate: '2026-10-10',
  })]);
});

it('disables an anchored picker when the chart has only a scheduling callback', () => {
  const { container } = render(<GanttChart tasks={[task]} showTaskList onScheduleIntent={vi.fn()} />);
  expect([...dateTriggers(container)].map((button) => button.disabled)).toEqual([true, true]);
});

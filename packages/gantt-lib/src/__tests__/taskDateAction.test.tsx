// @vitest-environment jsdom
// START_MODULE_CONTRACT
// PURPOSE: Verify consumer-owned actions beside built-in task dates.
// SCOPE: Both date slots and rerender when fixed boundaries change.
// INPUTS: Task row, columns and date action renderer.
// OUTPUTS: Accessible controls in the corresponding date cells.
// DEPENDS: React, testing-library, GanttChart
// LINKS: M-SCHEDULE
// END_MODULE_CONTRACT
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { GanttChart, type Task } from '../components/GanttChart';

it('renders both date actions and updates them when fixed fields change', () => {
  const task: Task = { id: 'p', name: 'Отделка', startDate: '2026-10-05', endDate: '2026-12-30' };
  const renderAction = (row: Task, boundary: 'start' | 'end') => <button type="button" aria-label={boundary} aria-pressed={Boolean(boundary === 'start' ? row.fixedStartDate : row.fixedEndDate)} />;
  const props = { showTaskList: true, onTasksChange: () => {}, renderTaskDateAction: renderAction };
  const view = render(<GanttChart {...props} tasks={[task]} />);
  expect(screen.getByRole('button', { name: 'start' }).getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('button', { name: 'end' }).getAttribute('aria-pressed')).toBe('false');
  view.rerender(<GanttChart {...props} tasks={[{ ...task, fixedStartDate: '2026-10-05', fixedEndDate: '2026-12-30' }]} />);
  expect(screen.getByRole('button', { name: 'start' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'end' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByRole('button', { name: 'Открепить начало' })).toBeNull();
});

it('pins a boundary from the cell and hides cell pins without removing the calendar controls', () => {
  const task: Task = { id: 'p', name: 'Отделка', startDate: '2026-10-05', endDate: '2026-12-30' };
  const fixed = { ...task, fixedStartDate: '2026-10-05' };
  const onTasksChange = vi.fn();
  const view = render(<GanttChart tasks={[task]} showTaskList onTasksChange={onTasksChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Закрепить начало' }));
  expect(onTasksChange).toHaveBeenLastCalledWith([fixed]);
  view.rerender(<GanttChart tasks={[fixed]} showTaskList onTasksChange={onTasksChange} />);
  const pinned = screen.getByRole('button', { name: 'Открепить начало' });
  expect(pinned.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(pinned);
  expect(onTasksChange).toHaveBeenLastCalledWith([{ ...fixed, fixedStartDate: null }]);
  view.rerender(<GanttChart tasks={[fixed]} showTaskList showTaskDatePins={false} onTasksChange={onTasksChange} />);
  expect(screen.queryByRole('button', { name: 'Открепить начало' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Открыть календарь: Начало' }));
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Снять закрепление: начало' })).toBeTruthy();
});

it('shows pin status for fixed dates in a read-only chart', () => {
  const task: Task = { id: 'p', name: 'Отделка', startDate: '2026-10-05', endDate: '2026-12-30', fixedStartDate: '2026-10-05' };
  render(<GanttChart tasks={[task]} showTaskList />);
  expect(screen.getByRole('img', { name: 'Начало закреплено' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Открепить начало' })).toBeNull();
  expect(screen.queryByRole('img', { name: 'Окончание закреплено' })).toBeNull();
});

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
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
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
});

import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GanttChart, type Task } from '../index';

type PlanFactTask = Task & {
  unit?: string;
};

function getCell(container: HTMLElement, taskId: string, dateKey: string, kind: 'plan' | 'fact') {
  const [, , day] = dateKey.split('-').map(Number);
  const dateIndex = day - 1;

  const cell = container.querySelector(
    `[data-plan-fact-task-id="${taskId}"][data-plan-fact-date-index="${dateIndex}"][data-plan-fact-kind="${kind}"]`
  ) as HTMLElement | null;
  expect(cell).not.toBeNull();
  return cell!;
}

describe('plan-fact mode', () => {
  it('renders a task list with two plan/fact subrows on the right', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'task-1',
        name: 'Монолит',
        startDate: '2026-04-01',
        endDate: '2026-04-03',
        planByDate: { '2026-04-01': 10 },
        factByDate: { '2026-04-02': 8 },
      },
    ];

    const { container } = render(
      <GanttChart<PlanFactTask>
        mode="plan-fact"
        tasks={tasks}
        showTaskList={true}
        rowHeight={40}
        dayWidth={32}
      />
    );

    expect(screen.getByText('Монолит')).toBeTruthy();
    expect(container.querySelector('.gantt-pf-row')).not.toBeNull();
    expect(container.querySelector('.gantt-tr-row')).toBeNull();
    expect(getCell(container, 'task-1', '2026-04-01', 'plan').textContent).toBe('10');
    expect(getCell(container, 'task-1', '2026-04-02', 'fact').textContent).toBe('8');
    expect(getCell(container, 'task-1', '2026-04-03', 'plan').classList.contains('gantt-pf-cell-planned')).toBe(true);
  });

  it('commits edited plan and fact values through onTasksChange', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'task-1',
        name: 'Работа',
        startDate: '2026-04-01',
        endDate: '2026-04-02',
      },
    ];
    const changes: PlanFactTask[][] = [];

    const { container } = render(
      <GanttChart<PlanFactTask>
        mode="plan-fact"
        tasks={tasks}
        dayWidth={32}
        onTasksChange={(changedTasks) => changes.push(changedTasks)}
      />
    );

    const planCell = getCell(container, 'task-1', '2026-04-01', 'plan');
    fireEvent.doubleClick(planCell);
    let input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '12,5' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(changes.at(-1)?.[0].planByDate).toEqual({ '2026-04-01': 12.5 });

    const factCell = getCell(container, 'task-1', '2026-04-02', 'fact');
    fireEvent.doubleClick(factCell);
    input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.blur(input);

    expect(changes.at(-1)?.[0].factByDate).toEqual({ '2026-04-02': 9 });
  });

  it('allows plan input outside the task date range and clears empty values', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'task-1',
        name: 'Работа',
        startDate: '2026-04-01',
        endDate: '2026-04-02',
        planByDate: { '2026-04-10': 4 },
      },
    ];
    const changes: PlanFactTask[][] = [];

    const { container } = render(
      <GanttChart<PlanFactTask>
        mode="plan-fact"
        tasks={tasks}
        dayWidth={32}
        onTasksChange={(changedTasks) => changes.push(changedTasks)}
      />
    );

    const outsideCell = getCell(container, 'task-1', '2026-04-10', 'plan');
    expect(outsideCell.classList.contains('gantt-pf-cell-planned')).toBe(false);

    fireEvent.doubleClick(outsideCell);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(changes.at(-1)?.[0].planByDate).toEqual({});
  });

  it('keeps parent plan/fact cells readonly and value-free', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'parent',
        name: 'Раздел',
        startDate: '2026-04-01',
        endDate: '2026-04-10',
        planByDate: { '2026-04-01': 100 },
      },
      {
        id: 'child',
        name: 'Работа',
        parentId: 'parent',
        startDate: '2026-04-01',
        endDate: '2026-04-02',
        planByDate: { '2026-04-01': 10 },
      },
    ];
    const changes: PlanFactTask[][] = [];

    const { container } = render(
      <GanttChart<PlanFactTask>
        mode="plan-fact"
        tasks={tasks}
        dayWidth={32}
        onTasksChange={(changedTasks) => changes.push(changedTasks)}
      />
    );

    const parentCell = getCell(container, 'parent', '2026-04-01', 'plan');
    expect(parentCell.textContent).toBe('');
    expect(parentCell.classList.contains('gantt-pf-cell-planned')).toBe(true);

    fireEvent.doubleClick(parentCell);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(changes).toEqual([]);
  });
});

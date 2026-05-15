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

  it('selects a continuous plan/fact cell range by dragging across rows and clears it', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'task-1',
        name: 'Работа 1',
        startDate: '2026-04-01',
        endDate: '2026-04-02',
        planByDate: { '2026-04-01': 1, '2026-04-02': 2 },
        factByDate: { '2026-04-01': 1, '2026-04-02': 2 },
      },
      {
        id: 'task-2',
        name: 'Работа 2',
        startDate: '2026-04-01',
        endDate: '2026-04-02',
        planByDate: { '2026-04-01': 3, '2026-04-02': 4 },
        factByDate: { '2026-04-01': 3, '2026-04-02': 4 },
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

    const firstCell = getCell(container, 'task-1', '2026-04-01', 'plan');
    const lastCell = getCell(container, 'task-2', '2026-04-02', 'fact');
    fireEvent.mouseDown(firstCell);
    fireEvent.mouseEnter(lastCell);
    fireEvent.mouseUp(window);

    expect(firstCell.classList.contains('gantt-pf-cell-selected')).toBe(true);
    expect(getCell(container, 'task-1', '2026-04-02', 'fact').classList.contains('gantt-pf-cell-selected')).toBe(true);
    expect(lastCell.classList.contains('gantt-pf-cell-selected')).toBe(true);

    fireEvent.keyDown(lastCell, { key: 'Delete' });

    expect(changes.at(-1)).toEqual([
      { ...tasks[0], planByDate: {}, factByDate: {} },
      { ...tasks[1], planByDate: {}, factByDate: {} },
    ]);
  });

  it('clears plan/fact selection with escape', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'task-1',
        name: 'Работа',
        startDate: '2026-04-01',
        endDate: '2026-04-02',
      },
    ];

    const { container } = render(
      <GanttChart<PlanFactTask>
        mode="plan-fact"
        tasks={tasks}
        dayWidth={32}
      />
    );

    const firstCell = getCell(container, 'task-1', '2026-04-01', 'plan');
    const lastCell = getCell(container, 'task-1', '2026-04-02', 'fact');
    fireEvent.mouseDown(firstCell);
    fireEvent.mouseEnter(lastCell);
    fireEvent.mouseUp(window);

    expect(firstCell.classList.contains('gantt-pf-cell-selected')).toBe(true);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(firstCell.classList.contains('gantt-pf-cell-selected')).toBe(false);
    expect(lastCell.classList.contains('gantt-pf-cell-selected')).toBe(false);
    expect(container.querySelector('.gantt-pf-fillHandle')).toBeNull();
  });

  it('clears plan/fact selection when clicking outside the matrix', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'task-1',
        name: 'Работа',
        startDate: '2026-04-01',
        endDate: '2026-04-02',
      },
    ];

    const { container } = render(
      <GanttChart<PlanFactTask>
        mode="plan-fact"
        tasks={tasks}
        dayWidth={32}
      />
    );

    const firstCell = getCell(container, 'task-1', '2026-04-01', 'plan');
    const lastCell = getCell(container, 'task-1', '2026-04-02', 'fact');
    fireEvent.mouseDown(firstCell);
    fireEvent.mouseEnter(lastCell);
    fireEvent.mouseUp(window);

    expect(firstCell.classList.contains('gantt-pf-cell-selected')).toBe(true);

    fireEvent.mouseDown(document.body);

    expect(firstCell.classList.contains('gantt-pf-cell-selected')).toBe(false);
    expect(lastCell.classList.contains('gantt-pf-cell-selected')).toBe(false);
    expect(container.querySelector('.gantt-pf-fillHandle')).toBeNull();
  });

  it('fills cells by dragging the selection corner handle', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'task-1',
        name: 'Работа',
        startDate: '2026-04-01',
        endDate: '2026-04-03',
        planByDate: { '2026-04-01': 5 },
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

    const sourceCell = getCell(container, 'task-1', '2026-04-01', 'plan');
    fireEvent.mouseDown(sourceCell);
    fireEvent.mouseUp(window);

    const fillHandle = sourceCell.querySelector('.gantt-pf-fillHandle') as HTMLElement | null;
    expect(fillHandle).not.toBeNull();

    fireEvent.mouseDown(fillHandle!);
    fireEvent.mouseEnter(getCell(container, 'task-1', '2026-04-03', 'plan'));
    fireEvent.mouseUp(window);

    expect(changes.at(-1)).toEqual([
      {
        ...tasks[0],
        planByDate: {
          '2026-04-01': 5,
          '2026-04-02': 5,
          '2026-04-03': 5,
        },
      },
    ]);
  });

  it('extends the selected range with shift plus arrow keys', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'task-1',
        name: 'Работа',
        startDate: '2026-04-01',
        endDate: '2026-04-03',
      },
    ];

    const { container } = render(
      <GanttChart<PlanFactTask>
        mode="plan-fact"
        tasks={tasks}
        dayWidth={32}
      />
    );

    const firstCell = getCell(container, 'task-1', '2026-04-01', 'plan');
    fireEvent.mouseDown(firstCell);
    fireEvent.mouseUp(window);
    fireEvent.keyDown(firstCell, { key: 'ArrowRight', shiftKey: true });

    expect(firstCell.classList.contains('gantt-pf-cell-selected')).toBe(true);
    expect(firstCell.classList.contains('gantt-pf-cell-rangeAnchor')).toBe(true);
    expect(firstCell.classList.contains('gantt-pf-cell-active')).toBe(true);
    expect(getCell(container, 'task-1', '2026-04-02', 'plan').classList.contains('gantt-pf-cell-selected')).toBe(true);
    expect(getCell(container, 'task-1', '2026-04-03', 'plan').classList.contains('gantt-pf-cell-selected')).toBe(false);

    fireEvent.keyDown(firstCell, { key: 'ArrowRight', shiftKey: true });
    expect(getCell(container, 'task-1', '2026-04-03', 'plan').classList.contains('gantt-pf-cell-selected')).toBe(true);
  });

  it('keeps the fill handle in the bottom-right corner of the selected range', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'task-1',
        name: 'Работа',
        startDate: '2026-04-01',
        endDate: '2026-04-03',
      },
    ];

    const { container } = render(
      <GanttChart<PlanFactTask>
        mode="plan-fact"
        tasks={tasks}
        dayWidth={32}
      />
    );

    const firstCell = getCell(container, 'task-1', '2026-04-01', 'plan');
    const rightCell = getCell(container, 'task-1', '2026-04-02', 'plan');
    fireEvent.mouseDown(firstCell);
    fireEvent.mouseUp(window);
    fireEvent.keyDown(firstCell, { key: 'ArrowRight', shiftKey: true });

    expect(firstCell.classList.contains('gantt-pf-cell-active')).toBe(true);
    expect(firstCell.querySelector('.gantt-pf-fillHandle')).toBeNull();
    expect(rightCell.querySelector('.gantt-pf-fillHandle')).not.toBeNull();
  });

  it('commits one edited value to every selected range cell with ctrl enter', () => {
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

    const firstCell = getCell(container, 'task-1', '2026-04-01', 'plan');
    const lastCell = getCell(container, 'task-1', '2026-04-02', 'fact');
    fireEvent.mouseDown(firstCell);
    fireEvent.mouseEnter(lastCell);
    fireEvent.mouseUp(window);
    fireEvent.keyDown(firstCell, { key: 'Enter' });

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(firstCell.contains(input)).toBe(true);
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });

    expect(changes.at(-1)).toEqual([
      {
        ...tasks[0],
        planByDate: {
          '2026-04-01': 7,
          '2026-04-02': 7,
        },
        factByDate: {
          '2026-04-01': 7,
          '2026-04-02': 7,
        },
      },
    ]);
  });

  it('skips parent rows when moving between tasks with arrow keys', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'task-1',
        name: 'Работа 1',
        startDate: '2026-04-01',
        endDate: '2026-04-01',
      },
      {
        id: 'parent',
        name: 'Раздел',
        startDate: '2026-04-01',
        endDate: '2026-04-01',
      },
      {
        id: 'task-2',
        name: 'Работа 2',
        parentId: 'parent',
        startDate: '2026-04-01',
        endDate: '2026-04-01',
      },
    ];

    const { container } = render(
      <GanttChart<PlanFactTask>
        mode="plan-fact"
        tasks={tasks}
        dayWidth={32}
      />
    );

    const startCell = getCell(container, 'task-1', '2026-04-01', 'fact');
    fireEvent.mouseDown(startCell);
    fireEvent.mouseUp(window);
    fireEvent.keyDown(startCell, { key: 'ArrowDown' });

    expect(getCell(container, 'parent', '2026-04-01', 'plan').classList.contains('gantt-pf-cell-active')).toBe(false);
    expect(getCell(container, 'task-2', '2026-04-01', 'plan').classList.contains('gantt-pf-cell-active')).toBe(true);
  });

  it('keeps parent plan/fact cells readonly, value-free, and unfilled', () => {
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
    expect(parentCell.classList.contains('gantt-pf-cell-planned')).toBe(false);

    fireEvent.doubleClick(parentCell);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(changes).toEqual([]);
  });

  it('passes custom weekends into the plan-fact calendar header and body overlay', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'task-1',
        name: 'Работа',
        startDate: '2026-04-01',
        endDate: '2026-04-03',
      },
    ];

    const { container } = render(
      <GanttChart<PlanFactTask>
        mode="plan-fact"
        tasks={tasks}
        dayWidth={32}
        customDays={[{ date: new Date(Date.UTC(2026, 3, 1)), type: 'weekend' }]}
      />
    );

    const headerWeekendCells = container.querySelectorAll('.gantt-pf-header .gantt-tsh-weekendDay');
    expect(headerWeekendCells.length).toBeGreaterThan(0);

    const bodyWeekendBlocks = container.querySelectorAll('.gantt-pf-body .gantt-gb-weekendBlock');
    expect(bodyWeekendBlocks.length).toBeGreaterThan(0);

    const firstWeekendBlock = bodyWeekendBlocks[0] as HTMLElement;
    expect(firstWeekendBlock.style.left).toBe('0px');
    expect(firstWeekendBlock.style.width).toBe('32px');
  });

  it('renders fact below plan with warning styling and keeps fact at or above plan green', () => {
    const tasks: PlanFactTask[] = [
      {
        id: 'task-1',
        name: 'Работа',
        startDate: '2026-04-01',
        endDate: '2026-04-02',
        planByDate: {
          '2026-04-01': 10,
          '2026-04-02': 10,
        },
        factByDate: {
          '2026-04-01': 8,
          '2026-04-02': 12,
        },
      },
    ];

    const { container } = render(
      <GanttChart<PlanFactTask>
        mode="plan-fact"
        tasks={tasks}
        dayWidth={32}
      />
    );

    const belowPlanCell = getCell(container, 'task-1', '2026-04-01', 'fact');
    const abovePlanCell = getCell(container, 'task-1', '2026-04-02', 'fact');

    expect(belowPlanCell.classList.contains('gantt-pf-cell-factWarning')).toBe(true);
    expect(abovePlanCell.classList.contains('gantt-pf-cell-factWarning')).toBe(false);
  });
});

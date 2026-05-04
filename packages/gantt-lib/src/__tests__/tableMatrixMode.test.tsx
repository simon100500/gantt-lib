import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GanttChart, type Task } from '../index';

type FinanceTask = Task & {
  weeklyPlan: Record<string, number>;
};

describe('table-matrix mode', () => {
  it('renders task list on the left and arbitrary matrix cells on the right', () => {
    const tasks: FinanceTask[] = [
      {
        id: 'task-1',
        name: 'Фундамент',
        startDate: '2026-04-01',
        endDate: '2026-04-20',
        weeklyPlan: {
          'w1': 1250000,
          'w2': 800000,
        },
      },
      {
        id: 'task-2',
        name: 'Каркас',
        startDate: '2026-04-10',
        endDate: '2026-05-10',
        weeklyPlan: {
          'w2': 640000,
          'w3': 1100000,
        },
      },
    ];

    const { container } = render(
      <GanttChart<FinanceTask>
        mode="table-matrix"
        tasks={tasks}
        showTaskList={true}
        taskListWidth={360}
        containerHeight={320}
        matrixColumnGroups={[
          { id: 'apr', header: 'Апрель 2026' },
          { id: 'may', header: 'Май 2026' },
        ]}
        matrixColumns={[
          { id: 'w1', header: '01-07', width: 110, groupId: 'apr', renderCell: (task) => task.weeklyPlan.w1?.toLocaleString('ru-RU') ?? '—' },
          { id: 'w2', header: '08-14', width: 110, groupId: 'apr', renderCell: (task) => task.weeklyPlan.w2?.toLocaleString('ru-RU') ?? '—' },
          { id: 'w3', header: '15-21', width: 110, groupId: 'may', renderCell: (task) => task.weeklyPlan.w3?.toLocaleString('ru-RU') ?? '—' },
        ]}
      />
    );

    expect(screen.getByText('Фундамент')).toBeTruthy();
    expect(screen.getByText('Апрель 2026')).toBeTruthy();
    expect(screen.getByText('01-07')).toBeTruthy();
    expect(screen.getByText('1 250 000')).toBeTruthy();
    expect(container.querySelector('.gantt-mx-row')).not.toBeNull();
    expect(container.querySelector('.gantt-tr-row')).toBeNull();
    expect(container.querySelector('.gantt-tsh-header')).toBeNull();
  });

  it('keeps parent row fill classes when descendants are collapsed', () => {
    const tasks: FinanceTask[] = [
      {
        id: 'parent',
        name: 'Раздел',
        startDate: '2026-04-01',
        endDate: '2026-04-20',
        weeklyPlan: { w1: 100 },
      },
      {
        id: 'child',
        name: 'Работа',
        startDate: '2026-04-02',
        endDate: '2026-04-05',
        parentId: 'parent',
        weeklyPlan: { w1: 50 },
      },
    ];

    const { container } = render(
      <GanttChart<FinanceTask>
        mode="table-matrix"
        tasks={tasks}
        showTaskList={true}
        collapsedParentIds={new Set(['parent'])}
        matrixColumns={[
          { id: 'w1', header: '01-07', width: 110, renderCell: (task) => task.weeklyPlan.w1?.toString() ?? '' },
        ]}
      />
    );

    const taskListParentRow = container.querySelector('.gantt-tl-row[data-gantt-task-row-id="parent"]');
    const matrixParentRow = container.querySelector('.gantt-mx-row[data-gantt-task-row-id="parent"]');

    expect(taskListParentRow?.classList.contains('gantt-tl-row-parent')).toBe(true);
    expect(taskListParentRow?.classList.contains('gantt-tl-row-level-0')).toBe(true);
    expect(matrixParentRow?.classList.contains('gantt-mx-row-parent')).toBe(true);
    expect(matrixParentRow?.classList.contains('gantt-mx-row-level-0')).toBe(true);
    expect(container.querySelector('.gantt-mx-row[data-gantt-task-row-id="child"]')).toBeNull();
  });

  it('does not render task-list drag handles when task dragging is disabled', () => {
    const tasks: FinanceTask[] = [
      {
        id: 'task-1',
        name: 'Строка',
        startDate: '2026-04-01',
        endDate: '2026-04-20',
        weeklyPlan: { w1: 100 },
      },
    ];

    const { container } = render(
      <GanttChart<FinanceTask>
        mode="table-matrix"
        tasks={tasks}
        showTaskList={true}
        disableTaskDrag={true}
        matrixColumns={[
          { id: 'w1', header: '01-07', width: 110, renderCell: (task) => task.weeklyPlan.w1?.toString() ?? '' },
        ]}
      />
    );

    expect(container.querySelector('.gantt-tl-drag-handle')).toBeNull();
  });

  it('calls matrix cell click handler with task and column context', () => {
    const tasks: FinanceTask[] = [
      {
        id: 'task-1',
        name: 'Строка',
        startDate: '2026-04-01',
        endDate: '2026-04-20',
        weeklyPlan: { w1: 100 },
      },
    ];
    const clicks: Array<{ taskId: string; columnId: string; rowIndex: number; columnIndex: number }> = [];

    const { container } = render(
      <GanttChart<FinanceTask>
        mode="table-matrix"
        tasks={tasks}
        showTaskList={true}
        matrixColumns={[
          { id: 'w1', header: '01-07', width: 110, renderCell: (task) => task.weeklyPlan.w1?.toString() ?? '' },
        ]}
        onMatrixCellClick={({ task, column, rowIndex, columnIndex }) => {
          clicks.push({ taskId: task.id, columnId: column.id, rowIndex, columnIndex });
        }}
      />
    );

    const cell = container.querySelector('.gantt-mx-cell');
    expect(cell).not.toBeNull();

    fireEvent.click(cell!);

    expect(clicks).toEqual([
      { taskId: 'task-1', columnId: 'w1', rowIndex: 0, columnIndex: 0 },
    ]);
  });
});

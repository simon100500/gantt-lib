import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

  it('expands task-list and matrix bodies to the available container height', () => {
    const tasks: FinanceTask[] = [
      {
        id: 'task-1',
        name: 'Фундамент',
        startDate: '2026-04-01',
        endDate: '2026-04-20',
        weeklyPlan: { w1: 1250000 },
      },
    ];

    const { container } = render(
      <GanttChart<FinanceTask>
        mode="table-matrix"
        tasks={tasks}
        showTaskList={true}
        headerHeight={52}
        rowHeight={36}
        containerHeight={320}
        matrixColumns={[
          { id: 'w1', header: '01-07', width: 110, renderCell: (task) => task.weeklyPlan.w1?.toLocaleString('ru-RU') ?? '—' },
        ]}
      />
    );

    const taskListBody = container.querySelector('.gantt-tl-body') as HTMLDivElement | null;
    const matrixBody = container.querySelector('.gantt-mx-body') as HTMLDivElement | null;

    expect(taskListBody?.style.minHeight).toBe('267px');
    expect(matrixBody?.style.minHeight).toBe('267px');
  });

  it('does not stretch the matrix root to the viewport width', () => {
    const tasks: FinanceTask[] = [
      {
        id: 'task-1',
        name: 'Строка',
        startDate: '2026-04-01',
        endDate: '2026-04-20',
        weeklyPlan: { w1: 1250000, w2: 800000 },
      },
    ];

    const { container } = render(
      <GanttChart<FinanceTask>
        mode="table-matrix"
        tasks={tasks}
        showTaskList={true}
        taskListWidth={360}
        containerHeight={320}
        matrixColumns={[
          { id: 'w1', header: '01-07', width: 110, renderCell: (task) => task.weeklyPlan.w1?.toLocaleString('ru-RU') ?? '—' },
          { id: 'w2', header: '08-14', width: 130, renderCell: (task) => task.weeklyPlan.w2?.toLocaleString('ru-RU') ?? '—' },
        ]}
      />
    );

    const matrixRoot = container.querySelector('.gantt-mx-root') as HTMLDivElement | null;
    const chartSurface = container.querySelector('.gantt-chartSurface') as HTMLDivElement | null;

    expect(matrixRoot?.style.width).toBe('240px');
    expect(getComputedStyle(matrixRoot!).minWidth).toBe('');
    expect(chartSurface?.style.width).toBe('240px');
    expect(chartSurface?.style.flex).toBe('0 0 auto');
  });

  it('supports content-sized matrix columns', () => {
    const tasks: FinanceTask[] = [
      {
        id: 'task-1',
        name: 'Строка',
        startDate: '2026-04-01',
        endDate: '2026-04-20',
        weeklyPlan: { small: 10, large: 1234567890 },
      },
    ];

    const { container } = render(
      <GanttChart<FinanceTask>
        mode="table-matrix"
        tasks={tasks}
        showTaskList={true}
        matrixColumns={[
          { id: 'small', header: 'Мал.', width: 'auto', minWidth: 72, maxWidth: 120, renderCell: (task) => task.weeklyPlan.small?.toLocaleString('ru-RU') ?? '—' },
          { id: 'large', header: 'Большая сумма', width: 'auto', minWidth: 96, maxWidth: 220, renderCell: (task) => task.weeklyPlan.large?.toLocaleString('ru-RU') ?? '—' },
        ]}
      />
    );

    const chartSurface = container.querySelector('.gantt-chartSurface') as HTMLDivElement | null;
    const matrixRoot = container.querySelector('.gantt-mx-root') as HTMLDivElement | null;
    const headerRow = container.querySelector('.gantt-mx-headerRow') as HTMLDivElement | null;
    const bodyRow = container.querySelector('.gantt-mx-row') as HTMLDivElement | null;
    const headerCells = container.querySelectorAll('.gantt-mx-header > .gantt-mx-headerRow .gantt-mx-headerCell');

    expect(chartSurface?.style.width).toBe('max-content');
    expect(matrixRoot?.style.width).toBe('168px');
    expect(headerRow?.style.gridTemplateColumns).toBe('72px 96px');
    expect(bodyRow?.style.gridTemplateColumns).toBe('72px 96px');
    expect((headerCells[0] as HTMLDivElement).style.minWidth).toBe('72px');
    expect((headerCells[1] as HTMLDivElement).style.minWidth).toBe('96px');
  });

  it('keeps the right border on the last matrix column', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/components/TableMatrix/TableMatrix.css'),
      'utf8'
    );

    expect(css).toMatch(/\.gantt-mx-headerCell,\s*\.gantt-mx-groupCell,\s*\.gantt-mx-cell\s*{[^}]*border-right:\s*1px solid var\(--gantt-grid-line-color, #e0e0e0\);/);
    expect(css).toMatch(/padding:\s*var\(--gantt-matrix-cell-vertical-padding, 0\) var\(--gantt-matrix-cell-horizontal-padding, 12px\);/);
    expect(css).toMatch(/\.gantt-mx-headerCell,\s*\.gantt-mx-groupCell,\s*\.gantt-mx-cell\s*{[^}]*white-space:\s*nowrap;/);
    expect(css).not.toMatch(/\.gantt-mx-headerCell:last-child/);
    expect(css).not.toMatch(/\.gantt-mx-cell:last-child/);
  });

  it('renders an optional actual-date overlay for period columns', () => {
    const tasks: FinanceTask[] = [
      {
        id: 'task-1',
        name: 'Строка',
        startDate: '2026-04-01',
        endDate: '2026-04-20',
        weeklyPlan: { past: 100, current: 200, future: 300 },
      },
    ];

    const { container } = render(
      <GanttChart<FinanceTask>
        mode="table-matrix"
        tasks={tasks}
        matrixDateOverlay={{ date: '2026-05-04' }}
        matrixColumns={[
          { id: 'past', header: 'Апрель', width: 100, periodStartDate: '2026-04-01', periodEndDate: '2026-04-30', renderCell: (task) => task.weeklyPlan.past },
          { id: 'current', header: 'Май', width: 100, periodStartDate: '2026-05-01', periodEndDate: '2026-05-07', renderCell: (task) => task.weeklyPlan.current },
          { id: 'future', header: 'Июнь', width: 100, periodStartDate: '2026-06-01', periodEndDate: '2026-06-30', renderCell: (task) => task.weeklyPlan.future },
        ]}
      />
    );

    const overlays = container.querySelectorAll('.gantt-mx-dateOverlay');
    const cellContents = container.querySelectorAll('.gantt-mx-cellContent');

    expect(overlays).toHaveLength(2);
    expect((overlays[0] as HTMLSpanElement).style.width).toBe('100%');
    expect((overlays[1] as HTMLSpanElement).style.width).toBe('57.14285714285714%');
    expect(cellContents).toHaveLength(3);
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

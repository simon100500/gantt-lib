"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GanttChart, type Task, type TaskListColumn, type TableMatrixColumn, type TableMatrixColumnGroup } from "gantt-lib";

type FinanceTask = Task & {
  owner: string;
  budget: number;
  paid: number;
  plannedByPeriod: Record<string, number>;
};

type MatrixView = 'week' | 'month';

type PeriodDefinition = {
  id: string;
  label: string;
  groupId?: string;
};

const financeTasks: FinanceTask[] = [
  {
    id: "phase-1",
    name: "Подготовительный этап",
    startDate: "2026-04-01",
    endDate: "2026-04-20",
    owner: "Контур 0",
    budget: 2750000,
    paid: 920000,
    plannedByPeriod: {
      "2026-04-w1": 950000,
      "2026-04-w2": 600000,
      "2026-04-w3": 350000,
      "2026-04-w4": 250000,
      "2026-04": 2150000,
      "2026-05": 600000,
    },
  },
  {
    id: "fp-1",
    name: "Подготовка площадки",
    startDate: "2026-04-01",
    endDate: "2026-04-12",
    parentId: "phase-1",
    owner: "Генподряд",
    budget: 1550000,
    paid: 620000,
    plannedByPeriod: {
      "2026-04-w1": 950000,
      "2026-04-w2": 600000,
      "2026-04": 1550000,
    },
  },
  {
    id: "fp-1-2",
    name: "Временные сети и бытовой городок",
    startDate: "2026-04-13",
    endDate: "2026-05-05",
    parentId: "phase-1",
    owner: "Субподряд",
    budget: 1200000,
    paid: 300000,
    plannedByPeriod: {
      "2026-04-w3": 350000,
      "2026-04-w4": 250000,
      "2026-05-w1": 350000,
      "2026-05-w2": 250000,
      "2026-04": 600000,
      "2026-05": 600000,
    },
  },
  {
    id: "phase-2",
    name: "Коробка здания",
    startDate: "2026-04-08",
    endDate: "2026-06-15",
    owner: "Монолит",
    budget: 10180000,
    paid: 1310000,
    plannedByPeriod: {
      "2026-04-w2": 640000,
      "2026-04-w3": 910000,
      "2026-04-w4": 1180000,
      "2026-05-w1": 1240000,
      "2026-05-w2": 1450000,
      "2026-05-w3": 930000,
      "2026-05-w4": 1050000,
      "2026-06-w1": 1220000,
      "2026-04": 2730000,
      "2026-05": 4670000,
      "2026-06": 2780000,
    },
  },
  {
    id: "fp-2",
    name: "Фундамент",
    startDate: "2026-04-08",
    endDate: "2026-05-18",
    parentId: "phase-2",
    owner: "Монолит",
    budget: 4860000,
    paid: 1310000,
    plannedByPeriod: {
      "2026-04-w2": 640000,
      "2026-04-w3": 910000,
      "2026-04-w4": 1180000,
      "2026-05-w1": 820000,
      "2026-05-w2": 690000,
      "2026-04": 2730000,
      "2026-05": 2130000,
    },
  },
  {
    id: "fp-3",
    name: "Каркас",
    startDate: "2026-05-01",
    endDate: "2026-06-15",
    parentId: "phase-2",
    owner: "Монолит",
    budget: 5320000,
    paid: 0,
    plannedByPeriod: {
      "2026-05-w1": 420000,
      "2026-05-w2": 760000,
      "2026-05-w3": 930000,
      "2026-05-w4": 1050000,
      "2026-06-w1": 1220000,
      "2026-05": 3160000,
      "2026-06": 2160000,
    },
  },
  {
    id: "phase-3",
    name: "Инженерный контур",
    startDate: "2026-05-10",
    endDate: "2026-06-28",
    owner: "MEP",
    budget: 3180000,
    paid: 540000,
    plannedByPeriod: {
      "2026-05-w3": 280000,
      "2026-05-w4": 490000,
      "2026-06-w1": 760000,
      "2026-06-w2": 940000,
      "2026-06-w3": 710000,
      "2026-05": 770000,
      "2026-06": 2410000,
    },
  },
  {
    id: "fp-4",
    name: "Инженерия и MEP",
    startDate: "2026-05-10",
    endDate: "2026-06-28",
    parentId: "phase-3",
    owner: "Субподряд",
    budget: 3180000,
    paid: 540000,
    plannedByPeriod: {
      "2026-05-w3": 280000,
      "2026-05-w4": 490000,
      "2026-06-w1": 760000,
      "2026-06-w2": 940000,
      "2026-06-w3": 710000,
      "2026-05": 770000,
      "2026-06": 2410000,
    },
  },
];

const weeklyPeriods: PeriodDefinition[] = [
  { id: "2026-04-w1", label: "01-07", groupId: "2026-04" },
  { id: "2026-04-w2", label: "08-14", groupId: "2026-04" },
  { id: "2026-04-w3", label: "15-21", groupId: "2026-04" },
  { id: "2026-04-w4", label: "22-30", groupId: "2026-04" },
  { id: "2026-05-w1", label: "01-07", groupId: "2026-05" },
  { id: "2026-05-w2", label: "08-14", groupId: "2026-05" },
  { id: "2026-05-w3", label: "15-21", groupId: "2026-05" },
  { id: "2026-05-w4", label: "22-31", groupId: "2026-05" },
  { id: "2026-06-w1", label: "01-07", groupId: "2026-06" },
  { id: "2026-06-w2", label: "08-14", groupId: "2026-06" },
  { id: "2026-06-w3", label: "15-21", groupId: "2026-06" },
];

const monthlyPeriods: PeriodDefinition[] = [
  { id: "2026-04", label: "Апрель" },
  { id: "2026-05", label: "Май" },
  { id: "2026-06", label: "Июнь" },
];

const monthGroups: TableMatrixColumnGroup[] = [
  { id: "2026-04", header: "Апрель 2026" },
  { id: "2026-05", header: "Май 2026" },
  { id: "2026-06", header: "Июнь 2026" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
}

type BudgetEditorProps = {
  value: number;
  editStartValue?: string;
  onCommit: (value: number) => void;
  onCancel: () => void;
};

function BudgetCellEditor({ value, editStartValue, onCommit, onCancel }: BudgetEditorProps) {
  const [draft, setDraft] = useState(editStartValue ?? String(value));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (editStartValue === undefined) {
      inputRef.current?.select();
    } else {
      const cursorPosition = editStartValue.length;
      inputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [editStartValue]);

  const commit = () => {
    const nextValue = parseMoneyInput(draft);
    if (nextValue !== null) {
      onCommit(nextValue);
      return;
    }
    onCancel();
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      className="gantt-tl-inline-editor-input"
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
      }}
      style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
    />
  );
}

function parseMoneyInput(value: string): number | null {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function distributeBudgetAcrossLeafTasks(tasks: FinanceTask[], parentTaskId: string, nextBudget: number): FinanceTask[] {
  const childrenByParent = new Map<string, FinanceTask[]>();

  for (const task of tasks) {
    if (!task.parentId) continue;
    const siblings = childrenByParent.get(task.parentId) ?? [];
    siblings.push(task);
    childrenByParent.set(task.parentId, siblings);
  }

  const leafTasks: FinanceTask[] = [];
  const collectLeafTasks = (taskId: string) => {
    const children = childrenByParent.get(taskId) ?? [];
    if (children.length === 0) {
      const leafTask = tasks.find((task) => task.id === taskId);
      if (leafTask) leafTasks.push(leafTask);
      return;
    }
    for (const child of children) {
      collectLeafTasks(child.id);
    }
  };

  collectLeafTasks(parentTaskId);
  if (leafTasks.length === 0) {
    return tasks.map((task) => task.id === parentTaskId ? { ...task, budget: nextBudget } : task);
  }

  const currentTotal = leafTasks.reduce((sum, task) => sum + task.budget, 0);
  const equalShare = nextBudget / leafTasks.length;
  const redistributedBudgetById = new Map<string, number>();

  let assignedBudget = 0;
  leafTasks.forEach((task, index) => {
    const rawBudget = currentTotal > 0 ? (task.budget / currentTotal) * nextBudget : equalShare;
    const roundedBudget = index === leafTasks.length - 1
      ? Math.max(0, nextBudget - assignedBudget)
      : Math.max(0, Math.round(rawBudget));
    redistributedBudgetById.set(task.id, roundedBudget);
    assignedBudget += roundedBudget;
  });

  return tasks.map((task) => (
    redistributedBudgetById.has(task.id)
      ? { ...task, budget: redistributedBudgetById.get(task.id)! }
      : task
  ));
}

function deriveHierarchyFinanceTasks(tasks: FinanceTask[]): FinanceTask[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const childrenByParent = new Map<string, FinanceTask[]>();

  for (const task of tasks) {
    if (!task.parentId) continue;
    const siblings = childrenByParent.get(task.parentId) ?? [];
    siblings.push(task);
    childrenByParent.set(task.parentId, siblings);
  }

  const mergePeriods = (rows: FinanceTask[]) => {
    const merged: Record<string, number> = {};
    for (const row of rows) {
      for (const [periodId, value] of Object.entries(row.plannedByPeriod)) {
        merged[periodId] = (merged[periodId] ?? 0) + value;
      }
    }
    return merged;
  };

  const visit = (taskId: string): FinanceTask => {
    const task = byId.get(taskId)!;
    const children = childrenByParent.get(taskId) ?? [];
    if (children.length === 0) {
      return task;
    }

    const derivedChildren = children.map((child) => visit(child.id));
    return {
      ...task,
      budget: derivedChildren.reduce((sum, child) => sum + child.budget, 0),
      paid: derivedChildren.reduce((sum, child) => sum + child.paid, 0),
      plannedByPeriod: mergePeriods(derivedChildren),
    };
  };

  return tasks.map((task) => visit(task.id));
}

function buildMatrixColumns(view: MatrixView): TableMatrixColumn<FinanceTask>[] {
  const periods = view === 'week' ? weeklyPeriods : monthlyPeriods;
  return periods.map((period) => ({
    id: period.id,
    header: period.label,
    groupId: period.groupId,
    width: view === 'week' ? 118 : 140,
    cellClassName: (task) => task.plannedByPeriod[period.id] ? 'finance-matrix-cell-active' : 'finance-matrix-cell-empty',
    renderCell: (task) => {
      const value = task.plannedByPeriod[period.id] ?? 0;
      const share = value > 0 ? Math.round((value / Math.max(task.budget, 1)) * 100) : 0;
      const showSecondaryLine = value > 0 && share >= 18;
      return (
        <div style={{ display: 'grid', gap: 2, justifyItems: 'end', width: '100%', padding: '2px 0' }}>
          <strong style={{ fontSize: 13, color: value > 0 ? '#0f172a' : '#94a3b8' }}>
            {value > 0 ? `${formatMoney(value)} ₽` : '—'}
          </strong>
          {showSecondaryLine && (
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {share}% бюджета
            </span>
          )}
        </div>
      );
    },
  }));
}

export default function FinancePlanMatrixDemo() {
  const [baseTasks, setBaseTasks] = useState<FinanceTask[]>(financeTasks);
  const [view, setView] = useState<MatrixView>('week');
  const [showShareLine, setShowShareLine] = useState(true);
  const tasks = useMemo(() => deriveHierarchyFinanceTasks(baseTasks), [baseTasks]);

  const additionalColumns = useMemo<TaskListColumn<FinanceTask>[]>(() => [
    {
      id: 'owner',
      header: 'Ответственный',
      width: 120,
      align: 'left',
      after: 'name',
      renderCell: ({ task }) => <span style={{ fontWeight: task.parentId ? 500 : 700 }}>{task.owner}</span>,
    },
    {
      id: 'budget',
      header: 'Бюджет',
      width: 120,
      align: 'right',
      after: 'owner',
      editable: true,
      renderCell: ({ task }) => <span style={{ fontWeight: task.parentId ? 500 : 700 }}>{formatMoney(task.budget)} ₽</span>,
      renderEditor: ({ task, editStartValue, updateTask, closeEditor }) => {
        return (
          <BudgetCellEditor
            value={task.budget}
            editStartValue={editStartValue}
            onCommit={(nextValue) => updateTask({ budget: nextValue })}
            onCancel={closeEditor}
          />
        );
      },
    },
    {
      id: 'paid',
      header: 'Оплачено',
      width: 120,
      align: 'right',
      after: 'budget',
      renderCell: ({ task }) => (
        <span style={{ color: task.paid > 0 ? '#0f766e' : '#94a3b8', fontWeight: task.parentId ? 500 : 700 }}>
          {formatMoney(task.paid)} ₽
        </span>
      ),
    },
  ], []);

  const matrixColumns = useMemo(() => {
    const periods = view === 'week' ? weeklyPeriods : monthlyPeriods;

    return periods.map((period) => ({
      id: period.id,
      header: period.label,
      groupId: period.groupId,
      width: view === 'week' ? 118 : 140,
      cellClassName: (task: FinanceTask) => task.plannedByPeriod[period.id] ? 'finance-matrix-cell-active' : 'finance-matrix-cell-empty',
      renderCell: (task: FinanceTask) => {
        const value = task.plannedByPeriod[period.id] ?? 0;
        const share = value > 0 ? Math.round((value / Math.max(task.budget, 1)) * 100) : 0;
        const showSecondaryLine = showShareLine && value > 0 && share >= 18;

        return (
          <div style={{ display: 'grid', gap: 2, justifyItems: 'end', width: '100%', padding: '2px 0' }}>
            <strong style={{ fontSize: 13, color: value > 0 ? '#0f172a' : '#94a3b8' }}>
              {value > 0 ? `${formatMoney(value)} ₽` : '—'}
            </strong>
            {showSecondaryLine && (
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {share}% бюджета
              </span>
            )}
          </div>
        );
      },
    }));
  }, [showShareLine, view]);

  return (
    <section className="demo-section">
      <h2 className="demo-section-title">Table Matrix Financial Plan</h2>
      <p className="demo-section-desc">
        Слева обычный <code>TaskList</code> с иерархией фаз и статей, справа произвольная матрица ячеек. В этом примере строки в режиме <code>table-matrix</code> автоматически ужимаются по контенту: где есть только сумма, строка ниже, где появляется вторая строка, высота увеличивается ровно под содержимое.
      </p>
      <div className="demo-controls">
        <button
          type="button"
          className={`demo-btn ${view === 'week' ? 'demo-btn-primary' : 'demo-btn-neutral'}`}
          onClick={() => setView('week')}
        >
          По неделям
        </button>
        <button
          type="button"
          className={`demo-btn ${view === 'month' ? 'demo-btn-primary' : 'demo-btn-neutral'}`}
          onClick={() => setView('month')}
        >
          По месяцам
        </button>
        <button
          type="button"
          className={`demo-btn ${showShareLine ? 'demo-btn-primary' : 'demo-btn-neutral'}`}
          onClick={() => setShowShareLine((current) => !current)}
        >
          {showShareLine ? 'Скрыть % строку' : 'Показать % строку'}
        </button>
        <span className="demo-hint">Корневые строки показывают агрегат по фазе, дочерние строки раскрывают детализацию по статьям.</span>
      </div>
      <div className="demo-chart-card">
        <GanttChart<FinanceTask>
          mode="table-matrix"
          tasks={tasks}
          showTaskList={true}
          taskListWidth={620}
          rowHeight={36}
          rowContentLines={showShareLine ? 2 : 1}
          headerHeight={52}
          containerHeight={420}
          matrixColumns={matrixColumns}
          matrixColumnGroups={view === 'week' ? monthGroups : undefined}
          additionalColumns={additionalColumns}
          hiddenTaskListColumns={['dependencies', 'progress', 'duration', 'startDate', 'endDate']}
          disableDependencyEditing={true}
          disableTaskNameEditing={true}
          enableAddTask={false}
          hideTaskListRowActions={true}
          onTasksChange={(changedTasks) => {
            setBaseTasks((current) => {
              let nextTasks = current;

              for (const changedTask of changedTasks) {
                const sourceTask = current.find((task) => task.id === changedTask.id);
                if (!sourceTask) continue;

                const hasChildren = current.some((task) => task.parentId === changedTask.id);
                if (hasChildren && typeof changedTask.budget === 'number' && changedTask.budget !== sourceTask.budget) {
                  nextTasks = distributeBudgetAcrossLeafTasks(nextTasks, changedTask.id, changedTask.budget);
                  continue;
                }

                nextTasks = nextTasks.map((task) => (
                  task.id === changedTask.id ? { ...task, ...changedTask } : task
                ));
              }

              return nextTasks;
            });
          }}
        />
      </div>
    </section>
  );
}

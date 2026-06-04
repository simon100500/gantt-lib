"use client";

import { useCallback, useMemo, useState } from "react";
import {
  GanttChart,
  type Task,
  type TaskListColumn,
  type TableMatrixColumn,
  type TableMatrixColumnGroup,
} from "gantt-lib";

type FinanceTask = Task & {
  owner: string;
  budget: number;
  paid: number;
  plannedByPeriod: Record<string, number>;
};

type PeriodDefinition = {
  id: string;
  label: string;
  groupId: string;
  startDate: string;
  endDate: string;
};

const GROUP_COUNT = 100;
const CHILDREN_PER_GROUP = 9;
const TOTAL_TASKS = GROUP_COUNT * (CHILDREN_PER_GROUP + 1);
const PERIOD_COUNT = 52;
const WEEK_COLUMN_WIDTH = 108;

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const toIsoDate = (source: Date): string => source.toISOString().slice(0, 10);

const addDays = (sourceDate: string | Date, days: number): string => {
  const source = typeof sourceDate === "string"
    ? new Date(`${sourceDate}T00:00:00.000Z`)
    : sourceDate;

  return toIsoDate(new Date(Date.UTC(
    source.getUTCFullYear(),
    source.getUTCMonth(),
    source.getUTCDate() + days,
  )));
};

const buildWeeklyPeriods = (): PeriodDefinition[] => {
  const periods: PeriodDefinition[] = [];
  const startDate = new Date(Date.UTC(2026, 0, 5));

  for (let index = 0; index < PERIOD_COUNT; index += 1) {
    const weekStart = addDays(startDate, index * 7);
    const weekEnd = addDays(weekStart, 6);
    const quarter = Math.floor(index / 13) + 1;

    periods.push({
      id: `2026-w${String(index + 1).padStart(2, "0")}`,
      label: `W${index + 1}`,
      groupId: `q${quarter}`,
      startDate: weekStart,
      endDate: weekEnd,
    });
  }

  return periods;
};

const weeklyPeriods = buildWeeklyPeriods();

const periodGroups: TableMatrixColumnGroup[] = Array.from({ length: 4 }, (_, index) => ({
  id: `q${index + 1}`,
  header: `${index + 1} кв. 2026`,
  width: 13 * WEEK_COLUMN_WIDTH,
}));

const formatMoney = (value: number) => moneyFormatter.format(Math.round(value));

function MoneyValue({ value, muted = false }: { value: number; muted?: boolean }) {
  return (
    <span className="finance-money-value" style={{ color: muted ? "#64748b" : "#0f172a" }}>
      {formatMoney(value)}
    </span>
  );
}

const mergePlan = (target: Record<string, number>, source: Record<string, number>) => {
  for (const [periodId, value] of Object.entries(source)) {
    target[periodId] = (target[periodId] ?? 0) + value;
  }
};

const createChildPlan = (groupIndex: number, childIndex: number, budget: number): Record<string, number> => {
  const plan: Record<string, number> = {};
  const firstWeek = (groupIndex * 3 + childIndex * 2) % (PERIOD_COUNT - 4);
  const duration = 3 + ((groupIndex + childIndex) % 4);
  const weeklyValue = budget / duration;

  for (let offset = 0; offset < duration; offset += 1) {
    const period = weeklyPeriods[firstWeek + offset];
    plan[period.id] = Math.round(weeklyValue * (0.88 + offset * 0.06));
  }

  return plan;
};

const createFinanceTasks = (): FinanceTask[] => {
  const tasks: FinanceTask[] = [];
  const owners = ["Финансы", "Снабжение", "СМР", "Проектирование", "ПНР"];

  for (let groupIndex = 0; groupIndex < GROUP_COUNT; groupIndex += 1) {
    const groupId = `finance-group-${groupIndex + 1}`;
    const groupStart = addDays("2026-01-05", groupIndex * 3);
    const groupEnd = addDays(groupStart, 44);
    const groupPlan: Record<string, number> = {};
    let groupBudget = 0;
    let groupPaid = 0;

    const children: FinanceTask[] = [];
    for (let childIndex = 0; childIndex < CHILDREN_PER_GROUP; childIndex += 1) {
      const budget = 180000 + groupIndex * 4200 + childIndex * 27500;
      const paid = Math.round(budget * (((groupIndex + childIndex) % 5) / 10));
      const plannedByPeriod = createChildPlan(groupIndex, childIndex, budget);
      const startDate = addDays(groupStart, childIndex * 4);
      const endDate = addDays(startDate, 11 + (childIndex % 4));

      groupBudget += budget;
      groupPaid += paid;
      mergePlan(groupPlan, plannedByPeriod);

      children.push({
        id: `${groupId}-item-${childIndex + 1}`,
        name: `Статья ${groupIndex + 1}.${childIndex + 1}`,
        parentId: groupId,
        startDate,
        endDate,
        owner: owners[(groupIndex + childIndex) % owners.length],
        budget,
        paid,
        plannedByPeriod,
        progress: Math.min(95, Math.round((paid / budget) * 100)),
        accepted: false,
      });
    }

    tasks.push({
      id: groupId,
      name: `Финансовый пакет ${groupIndex + 1}`,
      startDate: groupStart,
      endDate: groupEnd,
      owner: owners[groupIndex % owners.length],
      budget: groupBudget,
      paid: groupPaid,
      plannedByPeriod: groupPlan,
      progress: Math.min(95, Math.round((groupPaid / groupBudget) * 100)),
      accepted: false,
      divider: groupIndex > 0 ? "top" : undefined,
    });
    tasks.push(...children);
  }

  return tasks;
};

export default function FinanceMatrixStressDemo() {
  const initialTasks = useMemo(() => createFinanceTasks(), []);
  const [tasks, setTasks] = useState<FinanceTask[]>(initialTasks);

  const totals = useMemo(() => tasks.reduce(
    (result, task) => {
      if (!task.parentId) {
        result.budget += task.budget;
        result.paid += task.paid;
      }
      return result;
    },
    { budget: 0, paid: 0 },
  ), [tasks]);

  const additionalColumns = useMemo<TaskListColumn<FinanceTask>[]>(() => [
    {
      id: "owner",
      header: "Ответственный",
      width: 132,
      align: "left",
      after: "name",
      renderCell: ({ task }) => task.owner,
    },
    {
      id: "budget",
      header: "Бюджет",
      width: 124,
      align: "right",
      after: "owner",
      renderCell: ({ task }) => <MoneyValue value={task.budget} />,
    },
    {
      id: "paid",
      header: "Оплачено",
      width: 124,
      align: "right",
      after: "budget",
      renderCell: ({ task }) => <MoneyValue value={task.paid} muted={task.paid === 0} />,
    },
  ], []);

  const matrixColumns = useMemo<TableMatrixColumn<FinanceTask>[]>(() => weeklyPeriods.map((period) => ({
    id: period.id,
    header: period.label,
    groupId: period.groupId,
    periodStartDate: period.startDate,
    periodEndDate: period.endDate,
    width: WEEK_COLUMN_WIDTH,
    align: "right",
    cellClassName: (task) => task.plannedByPeriod[period.id] ? "finance-matrix-cell-active" : "finance-matrix-cell-empty",
    renderCell: (task) => {
      const value = task.plannedByPeriod[period.id] ?? 0;
      if (value === 0) return null;

      return <MoneyValue value={value} />;
    },
  })), []);

  const handleTasksChange = useCallback((updatedTasks: FinanceTask[]) => {
    setTasks((previousTasks) => {
      const updatedMap = new Map(updatedTasks.map((task) => [task.id, task]));
      return previousTasks.map((task) => updatedMap.get(task.id) ?? task);
    });
  }, []);

  return (
    <section className="demo-section finance-matrix-demo">
      <div className="demo-section-header">
        <div>
          <h1 className="demo-section-title">Finance Stress Test: 1000 Rows</h1>
          <p className="demo-section-desc">
            {TOTAL_TASKS} строк в режиме table-matrix: иерархия, финансовые колонки слева и 52 недельные колонки справа.
          </p>
        </div>
        <div className="demo-stats">
          <span className="demo-stat-pill">100 пакетов</span>
          <span className="demo-stat-pill">900 статей</span>
          <span className="demo-stat-pill">52 недели</span>
          <span className="demo-stat-pill">Бюджет: {formatMoney(totals.budget)}</span>
          <span className="demo-stat-pill">Оплачено: {formatMoney(totals.paid)}</span>
        </div>
      </div>

      <div className="demo-chart-card">
        <GanttChart<FinanceTask>
          mode="table-matrix"
          tasks={tasks}
          onTasksChange={handleTasksChange}
          showTaskList={true}
          taskListWidth={650}
          rowHeight={34}
          headerHeight={52}
          containerHeight="80dvh"
          matrixColumns={matrixColumns}
          matrixColumnGroups={periodGroups}
          additionalColumns={additionalColumns}
          hiddenTaskListColumns={["dependencies", "progress", "duration", "startDate", "endDate"]}
          disableDependencyEditing={true}
          disableTaskNameEditing={true}
          disableTaskListReorder={true}
          enableAddTask={false}
          hideTaskListRowActions={true}
        />
      </div>
    </section>
  );
}

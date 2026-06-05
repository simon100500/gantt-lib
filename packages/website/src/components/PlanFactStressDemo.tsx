"use client";

import { useCallback, useMemo, useState } from "react";
import { GanttChart, type Task, type TaskListColumn } from "gantt-lib";

type PlanFactStressTask = Task & {
  owner: string;
  unit: string;
  planByDate?: Record<string, number>;
  factByDate?: Record<string, number>;
};

const GROUP_COUNT = 100;
const CHILDREN_PER_GROUP = 9;
const TOTAL_TASKS = GROUP_COUNT * (CHILDREN_PER_GROUP + 1);
const PERIOD_DAYS = 730;
const MIN_TASK_DURATION_DAYS = 45;
const MAX_EXTRA_TASK_DURATION_DAYS = 35;

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftIsoDate(source: Date, days: number) {
  return toIsoDate(new Date(Date.UTC(
    source.getUTCFullYear(),
    source.getUTCMonth(),
    source.getUTCDate() + days,
  )));
}

function buildDailyValues(startOffset: number, length: number, seed: number) {
  const values: Record<string, number> = {};
  const baseDate = new Date(Date.UTC(2026, 3, 1));

  for (let day = 0; day < length; day += 1) {
    const dateKey = shiftIsoDate(baseDate, startOffset + day);
    const value = 8 + ((seed + day * 3) % 7) * 2;
    values[dateKey] = value;
  }

  return values;
}

function buildFactValues(planByDate: Record<string, number>, seed: number) {
  const factByDate: Record<string, number> = {};
  const entries = Object.entries(planByDate);

  for (let index = 0; index < entries.length; index += 1) {
    const [dateKey, planValue] = entries[index];
    const delta = ((seed + index) % 5) - 2;
    factByDate[dateKey] = Math.max(0, planValue + delta);
  }

  return factByDate;
}

function createPlanFactDataset(): PlanFactStressTask[] {
  const tasks: PlanFactStressTask[] = [];
  const baseDate = new Date(Date.UTC(2026, 3, 1));
  const owners = ["Монолит", "Фасад", "ОВ", "ВК", "ЭОМ"];
  const units = ["м3", "т", "м2", "п.м.", "шт"];
  const maxGroupOffset = PERIOD_DAYS - MIN_TASK_DURATION_DAYS - MAX_EXTRA_TASK_DURATION_DAYS - CHILDREN_PER_GROUP * 3;

  for (let groupIndex = 0; groupIndex < GROUP_COUNT; groupIndex += 1) {
    const groupId = `pf-group-${groupIndex + 1}`;
    const groupOffset = Math.floor((groupIndex / Math.max(1, GROUP_COUNT - 1)) * maxGroupOffset);
    const groupStart = shiftIsoDate(baseDate, groupOffset);
    const groupEnd = shiftIsoDate(
      baseDate,
      groupOffset + CHILDREN_PER_GROUP * 3 + MIN_TASK_DURATION_DAYS + MAX_EXTRA_TASK_DURATION_DAYS
    );

    tasks.push({
      id: groupId,
      name: `Секция ${groupIndex + 1}`,
      startDate: groupStart,
      endDate: groupEnd,
      owner: owners[groupIndex % owners.length],
      unit: "разные",
    });

    for (let childIndex = 0; childIndex < CHILDREN_PER_GROUP; childIndex += 1) {
      const taskOffset = groupOffset + childIndex * 3;
      const duration = MIN_TASK_DURATION_DAYS + ((groupIndex * 7 + childIndex * 5) % MAX_EXTRA_TASK_DURATION_DAYS);
      const startDate = shiftIsoDate(baseDate, taskOffset);
      const endDate = shiftIsoDate(baseDate, taskOffset + duration);
      const planByDate = buildDailyValues(taskOffset, duration + 1, groupIndex * 10 + childIndex);
      const factByDate = buildFactValues(planByDate, groupIndex * 3 + childIndex);

      tasks.push({
        id: `${groupId}-task-${childIndex + 1}`,
        parentId: groupId,
        name: `Работа ${groupIndex + 1}.${childIndex + 1}`,
        startDate,
        endDate,
        owner: owners[(groupIndex + childIndex) % owners.length],
        unit: units[(groupIndex + childIndex) % units.length],
        planByDate,
        factByDate,
      });
    }
  }

  return tasks;
}

function sumTaskValues(task: PlanFactStressTask, field: "planByDate" | "factByDate") {
  return Object.values(task[field] ?? {}).reduce((sum, value) => sum + value, 0);
}

function formatAmount(value: number) {
  return value === 0 ? "—" : value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

function hasChildren(tasks: PlanFactStressTask[], taskId: string) {
  return tasks.some((candidate) => candidate.parentId === taskId);
}

export default function PlanFactStressDemo() {
  const initialTasks = useMemo(() => createPlanFactDataset(), []);
  const [tasks, setTasks] = useState<PlanFactStressTask[]>(initialTasks);

  const parentTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const task of tasks) {
      if (task.parentId) ids.add(task.parentId);
    }
    return ids;
  }, [tasks]);

  const totals = useMemo(() => ({
    plan: tasks.reduce((sum, task) => parentTaskIds.has(task.id) ? sum : sum + sumTaskValues(task, "planByDate"), 0),
    fact: tasks.reduce((sum, task) => parentTaskIds.has(task.id) ? sum : sum + sumTaskValues(task, "factByDate"), 0),
  }), [parentTaskIds, tasks]);

  const additionalColumns = useMemo<TaskListColumn<PlanFactStressTask>[]>(() => [
    {
      id: "owner",
      header: "Участок",
      width: 104,
      after: "name",
      renderCell: ({ task }) => task.owner,
    },
    {
      id: "unit",
      header: "Ед.",
      width: 64,
      align: "center",
      after: "owner",
      renderCell: ({ task }) => (hasChildren(tasks, task.id) ? "" : task.unit),
    },
    {
      id: "planTotal",
      header: "План",
      width: 92,
      align: "right",
      after: "unit",
      renderCell: ({ task }) => parentTaskIds.has(task.id) ? "" : formatAmount(sumTaskValues(task, "planByDate")),
    },
    {
      id: "factTotal",
      header: "Факт",
      width: 92,
      align: "right",
      after: "planTotal",
      renderCell: ({ task }) => {
        if (parentTaskIds.has(task.id)) return "";

        const planTotal = sumTaskValues(task, "planByDate");
        const factTotal = sumTaskValues(task, "factByDate");
        const statusClass = factTotal >= planTotal
          ? "plan-fact-total-positive"
          : "plan-fact-total-negative";

        return <span className={statusClass}>{formatAmount(factTotal)}</span>;
      },
    },
  ], [parentTaskIds, tasks]);

  const handleTasksChange = useCallback((changedTasks: PlanFactStressTask[]) => {
    setTasks((current) => current.map((task) => {
      const changedTask = changedTasks.find((candidate) => candidate.id === task.id);
      return changedTask ? { ...task, ...changedTask } : task;
    }));
  }, []);

  return (
    <section className="demo-section plan-fact-demo">
      <div className="demo-section-header">
        <div>
          <h1 className="demo-section-title">Plan-Fact Stress Test: 1000 Rows</h1>
          <p className="demo-section-desc">
            100 групп и 900 дочерних строк на дневной шкале около двух лет для проверки производительности, прокрутки, выделения ячеек и массового ввода в режиме plan-fact.
          </p>
        </div>
        <div className="demo-stats">
          <span className="demo-stat-pill">{GROUP_COUNT} групп</span>
          <span className="demo-stat-pill">{TOTAL_TASKS - GROUP_COUNT} задач</span>
          <span className="demo-stat-pill">{TOTAL_TASKS} строк</span>
          <span className="demo-stat-pill">{PERIOD_DAYS} дней</span>
          <span className="demo-stat-pill">План: {totals.plan.toLocaleString("ru-RU")}</span>
          <span className="demo-stat-pill">Факт: {totals.fact.toLocaleString("ru-RU")}</span>
        </div>
      </div>

      <div className="demo-chart-card">
        <GanttChart<PlanFactStressTask>
          mode="plan-fact"
          tasks={tasks}
          showTaskList={true}
          taskListWidth={620}
          containerHeight="80dvh"
          rowHeight={42}
          dayWidth={38}
          rowContentLines={2}
          additionalColumns={additionalColumns}
          hiddenTaskListColumns={["dependencies", "progress", "duration", "startDate", "endDate"]}
          disableTaskNameEditing={true}
          disableDependencyEditing={true}
          disableTaskDrag={true}
          hideTaskListRowActions={true}
          enableAddTask={false}
          onTasksChange={handleTasksChange}
        />
      </div>
    </section>
  );
}

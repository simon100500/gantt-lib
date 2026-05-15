"use client";

import { useMemo, useState } from "react";
import { GanttChart, type Task, type TaskListColumn } from "gantt-lib";

type PlanFactTask = Task & {
  owner: string;
  unit: string;
  planByDate?: Record<string, number>;
  factByDate?: Record<string, number>;
};

const initialTasks: PlanFactTask[] = [
  {
    id: "pf-1",
    name: "Монолитные работы",
    startDate: "2026-04-01",
    endDate: "2026-04-12",
    owner: "Монолит",
    unit: "м3",
    planByDate: {
      "2026-04-01": 18,
      "2026-04-02": 22,
      "2026-04-03": 24,
      "2026-04-06": 26,
    },
    factByDate: {
      "2026-04-01": 16,
      "2026-04-02": 21,
    },
  },
  {
    id: "pf-2",
    name: "Армирование",
    startDate: "2026-04-04",
    endDate: "2026-04-18",
    owner: "Монолит",
    unit: "т",
    planByDate: {
      "2026-04-04": 4,
      "2026-04-05": 5,
      "2026-04-08": 6,
    },
    factByDate: {
      "2026-04-04": 3.5,
    },
  },
  {
    id: "pf-3",
    name: "Фасад",
    startDate: "2026-04-10",
    endDate: "2026-04-25",
    owner: "Фасад",
    unit: "м2",
    planByDate: {
      "2026-04-10": 120,
      "2026-04-11": 140,
      "2026-04-12": 140,
    },
  },
  {
    id: "pf-group",
    name: "Инженерные сети",
    startDate: "2026-04-08",
    endDate: "2026-04-28",
    owner: "MEP",
    unit: "разные",
  },
  {
    id: "pf-4",
    name: "Вентиляция",
    startDate: "2026-04-08",
    endDate: "2026-04-20",
    parentId: "pf-group",
    owner: "MEP",
    unit: "п.м.",
    planByDate: {
      "2026-04-08": 35,
      "2026-04-09": 40,
      "2026-04-10": 45,
    },
  },
  {
    id: "pf-5",
    name: "Электрика",
    startDate: "2026-04-14",
    endDate: "2026-04-28",
    parentId: "pf-group",
    owner: "ЭОМ",
    unit: "точки",
    planByDate: {
      "2026-04-14": 12,
      "2026-04-15": 18,
      "2026-04-16": 20,
    },
  },
];

function sumValues(tasks: PlanFactTask[], field: "planByDate" | "factByDate") {
  return tasks.reduce((sum, task) => {
    if (tasks.some((candidate) => candidate.parentId === task.id)) return sum;
    return sum + Object.values(task[field] ?? {}).reduce((rowSum, value) => rowSum + value, 0);
  }, 0);
}

function sumTaskValues(task: PlanFactTask, field: "planByDate" | "factByDate") {
  return Object.values(task[field] ?? {}).reduce((sum, value) => sum + value, 0);
}

function formatAmount(value: number) {
  return value === 0 ? "—" : value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

function hasChildren(tasks: PlanFactTask[], taskId: string) {
  return tasks.some((candidate) => candidate.parentId === taskId);
}

export default function PlanFactDemo() {
  const [tasks, setTasks] = useState<PlanFactTask[]>(initialTasks);
  const parentTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const task of tasks) {
      if (task.parentId) ids.add(task.parentId);
    }
    return ids;
  }, [tasks]);
  const totals = useMemo(() => ({
    plan: sumValues(tasks, "planByDate"),
    fact: sumValues(tasks, "factByDate"),
  }), [tasks]);

  const additionalColumns = useMemo<TaskListColumn<PlanFactTask>[]>(() => [
    {
      id: "owner",
      header: "Участок",
      width: 110,
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
      renderCell: ({ task }) => parentTaskIds.has(task.id)
        ? ""
        : formatAmount(sumTaskValues(task, "planByDate")),
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

        return (
          <span className={statusClass}>
            {formatAmount(factTotal)}
          </span>
        );
      },
    },
  ], [parentTaskIds, tasks]);

  return (
    <section className="demo-section plan-fact-demo">
      <div className="demo-section-header">
        <div>
          <h2 className="demo-section-title">Plan-Fact Daily Input</h2>
          <p className="demo-section-desc">
            Верхняя подстрока дня — план, нижняя — факт. Плановые дни подсвечены по датам задачи, но значения можно вводить в любую видимую дату.
          </p>
        </div>
        <div className="demo-stats">
          <span className="demo-stat-pill">План: {totals.plan.toLocaleString("ru-RU")}</span>
          <span className="demo-stat-pill">Факт: {totals.fact.toLocaleString("ru-RU")}</span>
        </div>
      </div>
      <div className="demo-chart-card">
        <GanttChart<PlanFactTask>
          mode="plan-fact"
          tasks={tasks}
          showTaskList={true}
          taskListWidth={620}
          containerHeight={520}
          rowHeight={46}
          dayWidth={42}
          rowContentLines={2}
          additionalColumns={additionalColumns}
          hiddenTaskListColumns={["dependencies", "progress", "duration", "startDate", "endDate"]}
          disableTaskNameEditing={true}
          disableDependencyEditing={true}
          disableTaskDrag={true}
          hideTaskListRowActions={true}
          enableAddTask={false}
          onTasksChange={(changedTasks) => {
            setTasks((current) => current.map((task) => {
              const changedTask = changedTasks.find((candidate) => candidate.id === task.id);
              return changedTask ? { ...task, ...changedTask } : task;
            }));
          }}
        />
      </div>
    </section>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import { GanttChart, type Task } from "gantt-lib";

const GROUP_COUNT = 100;
const CHILDREN_PER_GROUP = 9;
const TOTAL_TASKS = GROUP_COUNT * (CHILDREN_PER_GROUP + 1);
type ViewMode = "day" | "week" | "month";

const VIEW_MODE_OPTIONS: Array<{ value: ViewMode; label: string; dayWidth: number }> = [
  { value: "day", label: "День", dayWidth: 24 },
  { value: "week", label: "Неделя", dayWidth: 8 },
  { value: "month", label: "Месяц", dayWidth: 2.5 },
];

const toIsoDate = (source: Date): string => source.toISOString().slice(0, 10);

const shiftIsoDate = (sourceDate: string | Date, days: number): string => {
  const source = typeof sourceDate === "string"
    ? new Date(`${sourceDate}T00:00:00.000Z`)
    : new Date(sourceDate);
  const shifted = new Date(Date.UTC(
    source.getUTCFullYear(),
    source.getUTCMonth(),
    source.getUTCDate() + days,
  ));
  return toIsoDate(shifted);
};

const createLargeDataset = (): Task[] => {
  const tasks: Task[] = [];
  const baseDate = new Date(Date.UTC(2026, 0, 5));

  for (let groupIndex = 0; groupIndex < GROUP_COUNT; groupIndex += 1) {
    const groupId = `group-${groupIndex + 1}`;
    const groupStart = shiftIsoDate(baseDate, groupIndex * 6);
    const groupEnd = shiftIsoDate(groupStart, 16);

    tasks.push({
      id: groupId,
      name: `Поток ${groupIndex + 1}`,
      startDate: groupStart,
      endDate: groupEnd,
      baselineStartDate: shiftIsoDate(groupStart, -2),
      baselineEndDate: shiftIsoDate(groupEnd, -2),
      progress: (groupIndex * 7) % 100,
      accepted: false,
      color: groupIndex % 2 === 0 ? "#2563eb" : "#0f766e",
      divider: groupIndex > 0 ? "top" : undefined,
      dependencies: groupIndex > 0
        ? [{ taskId: `group-${groupIndex}`, type: "FS", lag: 0 }]
        : [],
    });

    for (let childIndex = 0; childIndex < CHILDREN_PER_GROUP; childIndex += 1) {
      const taskId = `${groupId}-task-${childIndex + 1}`;
      const startDate = shiftIsoDate(groupStart, childIndex * 2);
      const endDate = shiftIsoDate(startDate, 2 + (childIndex % 3));

      tasks.push({
        id: taskId,
        name: `Задача ${groupIndex + 1}.${childIndex + 1}`,
        parentId: groupId,
        startDate,
        endDate,
        baselineStartDate: shiftIsoDate(startDate, -1),
        baselineEndDate: shiftIsoDate(endDate, -1),
        progress: (groupIndex * 13 + childIndex * 11) % 100,
        accepted: false,
        color: childIndex % 4 === 0 ? "#7c3aed" : undefined,
        dependencies: [],
      });
    }
  }

  return tasks;
};

export default function LargeDatasetDemo() {
  const initialTasks = useMemo(() => createLargeDataset(), []);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const activeViewMode = VIEW_MODE_OPTIONS.find((option) => option.value === viewMode) ?? VIEW_MODE_OPTIONS[0];

  const handleTasksChange = useCallback((updatedTasks: Task[]) => {
    setTasks((previousTasks) => {
      const updatedMap = new Map(updatedTasks.map((task) => [task.id, task]));
      return previousTasks.map((task) => updatedMap.get(task.id) ?? task);
    });
  }, []);

  return (
    <section className="demo-section">
      <div className="demo-section-header">
        <div>
          <h1 className="demo-section-title">Stress Test: 1000 Rows</h1>
          <p className="demo-section-desc">
            {TOTAL_TASKS} tasks, shared task list + chart scroll, dependencies, hierarchy, and baseline bars.
          </p>
        </div>
        <div className="demo-stats">
          <span className="demo-stat-pill">100 groups</span>
          <span className="demo-stat-pill">900 child tasks</span>
          <span className="demo-stat-pill">80dvh viewport</span>
          <span className="demo-stat-pill">mode: {activeViewMode.label}</span>
        </div>
      </div>

      <div className="demo-controls" aria-label="Timeline scale controls">
        {VIEW_MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`demo-btn ${viewMode === option.value ? "demo-btn-active" : "demo-btn-neutral"}`}
            onClick={() => setViewMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="demo-chart-card">
        <GanttChart
          tasks={tasks}
          onTasksChange={handleTasksChange}
          containerHeight="80dvh"
          showTaskList={true}
          showChart={true}
          taskListWidth={560}
          rowHeight={34}
          highlightExpiredTasks={true}
          showBaseline={true}
          enableAutoSchedule={true}
          businessDays={true}
          viewMode={viewMode}
          dayWidth={activeViewMode.dayWidth}
        />
      </div>
    </section>
  );
}

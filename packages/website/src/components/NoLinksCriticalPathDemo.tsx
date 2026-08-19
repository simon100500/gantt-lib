"use client";

import { useCallback, useState } from "react";
import { GanttChart, type Task } from "gantt-lib";

const isoDate = (year: number, month: number, day: number): string =>
  new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);

const isoDatePlusDays = (start: string, days: number): string => {
  const source = new Date(`${start}T00:00:00.000Z`);
  return new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate() + days)
  )
    .toISOString()
    .slice(0, 10);
};

interface TaskSeed {
  id: string;
  name: string;
  start: [number, number, number];
  durationDays: number;
  progress?: number;
  milestone?: boolean;
}

const TASK_SEEDS: TaskSeed[] = [
  // «Последовательная» на глаз цепочка — но связей нет.
  { id: "nl-1", name: "Цепочка: шаг 1", start: [2026, 2, 2], durationDays: 5, progress: 100 },
  { id: "nl-2", name: "Цепочка: шаг 2", start: [2026, 2, 9], durationDays: 5, progress: 60 },
  { id: "nl-3", name: "Цепочка: шаг 3", start: [2026, 2, 16], durationDays: 5, progress: 0 },
  // Параллельные ветки разной длины.
  { id: "nl-4", name: "Параллельная ветка A (длинная)", start: [2026, 2, 2], durationDays: 10, progress: 40 },
  { id: "nl-5", name: "Параллельная ветка B (короткая)", start: [2026, 2, 4], durationDays: 3, progress: 100 },
  // Короткая, но поздняя работа — именно она задает финиш проекта.
  { id: "nl-6", name: "Поздняя короткая работа", start: [2026, 2, 17], durationDays: 7, progress: 0 },
  // Веха, заканчивающаяся в тот же день, что и nl-6 — тоже критическая (ничья по финишу).
  { id: "nl-7", name: "Веха финиша проекта", start: [2026, 2, 23], durationDays: 1, milestone: true },
];

const createTasks = (): Task[] =>
  TASK_SEEDS.map((seed) => {
    const startDate = isoDate(...seed.start);
    return {
      id: seed.id,
      name: seed.name,
      startDate,
      endDate: isoDatePlusDays(startDate, seed.durationDays - 1),
      progress: seed.progress ?? 0,
      type: seed.milestone ? ("milestone" as const) : ("task" as const),
      dependencies: [],
    };
  });

export default function NoLinksCriticalPathDemo() {
  const [tasks, setTasks] = useState<Task[]>(createTasks);
  const [criticalPathMode, setCriticalPathMode] = useState<"highlight" | "hide" | undefined>("highlight");

  const handleChange = useCallback((updatedTasks: Task[]) => {
    setTasks((prev) => {
      const updatedMap = new Map(updatedTasks.map((t) => [t.id, t]));
      return prev.map((t) => updatedMap.get(t.id) ?? t);
    });
  }, []);

  const filterBtnStyle = (active?: boolean, color?: string) => ({
    padding: "4px 12px",
    fontSize: "0.875rem",
    borderRadius: "6px",
    border: "1px solid",
    cursor: "pointer",
    backgroundColor: active ? color || "#1f2937" : "transparent",
    color: active ? "#ffffff" : "#374151",
    borderColor: active ? color || "#1f2937" : "#d1d5db",
  });

  return (
    <section className="demo-section">
      <h2 className="demo-section-title">Критический путь без связей</h2>
      <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: "0.9rem" }}>
        Ни у одной работы нет зависимостей — цепочка шагов 1–3 и параллельные ветки накиданы просто датами.
        Критической становится только работа, которая заканчивается последней (здесь — «Поздняя короткая работа»
        и веха финиша с тем же днём окончания). Попробуйте: перетащите «Позднюю короткую работу» левее —
        подсветка переедет на новый максимальный финиш (шаг 3 цепочки).
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: 500 }}>Критический путь:</span>
        <button onClick={() => setCriticalPathMode(undefined)} style={filterBtnStyle(criticalPathMode === undefined)}>
          Выкл
        </button>
        <button
          onClick={() => setCriticalPathMode("highlight")}
          style={filterBtnStyle(criticalPathMode === "highlight", "#dc2626")}
        >
          Подсветить
        </button>
        <button
          onClick={() => setCriticalPathMode("hide")}
          style={filterBtnStyle(criticalPathMode === "hide", "#dc2626")}
        >
          Только критические
        </button>
        <button className="demo-btn demo-btn-secondary" onClick={() => setTasks(createTasks())}>
          Сбросить
        </button>
      </div>

      <div className="demo-chart-card">
        <GanttChart
          tasks={tasks}
          criticalPathMode={criticalPathMode}
          businessDays={false}
          dayWidth={24}
          rowHeight={36}
          containerHeight={"50dvh"}
          onTasksChange={handleChange}
        />
      </div>
    </section>
  );
}

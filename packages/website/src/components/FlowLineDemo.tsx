"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { GanttChart, type Task, type TimelineMarker } from "gantt-lib";

const START = Date.UTC(2026, 2, 2); // пн 2 мар 2026, ось «д.0»

const day = (offset: number) => new Date(START + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

// Работы отделки этажа: цвет = вид работы. Каждая начинается после предыдущей.
type WorkKind = { name: string; duration: number; color: string };

const WORKS: WorkKind[] = [
  { name: "Стяжка", duration: 3, color: "#8b5cf6" },
  { name: "Грунт", duration: 1, color: "#38bdf8" },
  { name: "Обои", duration: 3, color: "#f59e0b" },
  { name: "Двери", duration: 2, color: "#10b981" },
];

interface FloorPlan {
  /** Смещение начала работ этажа от д.0 */
  startOffset: number;
  /** Сдвиг каждой следующей работы относительно конца предыдущей (отрицательный = параллельно) */
  overlaps?: number[];
}

/**
 * Потоковая схема как на линии балансировки: этажи сдвинуты на 2 дня,
 * внутри этажа работы идут последовательно — одна дорожка.
 */
const sequentialFloors = (floors: number): FloorPlan[] =>
  Array.from({ length: floors }, (_, index) => ({ startOffset: index * 2 }));

/**
 * Тот же поток, но внутри этажа работы заходят друг на друга:
 * максимум одновременных работ задаёт число дорожек в строке.
 */
const parallelFloors = (floors: number): FloorPlan[] =>
  Array.from({ length: floors }, (_, index) => ({
    startOffset: index * 2,
    overlaps: [-1, -1, 0],
  }));

const buildTasks = (plans: FloorPlan[]): Task[] =>
  plans
    .map((plan, index) => {
      let cursor = plan.startOffset;
      const activities = WORKS.map((work, workIndex) => {
        const start = cursor;
        cursor = start + work.duration + (plan.overlaps?.[workIndex] ?? 0);
        return { id: `w${workIndex}`, name: work.name, startDate: day(start), endDate: day(start + work.duration - 1), color: work.color };
      });
      return {
        id: `floor-${index + 1}`,
        name: `Этаж ${index + 1}`,
        startDate: day(plan.startOffset),
        endDate: day(cursor - 1),
        activities,
      };
    })
    .reverse();

const markers: TimelineMarker[] = [
  { date: day(18), color: "#ef4444", name: "Д 18" },
];

const chartProps = {
  showTaskList: true,
  showChart: true,
  businessDays: false,
  dateRange: { start: day(-6), end: day(64) },
  dayWidth: 26,
  rowHeight: 40,
  taskListWidth: 190,
  hiddenTaskListColumns: ["startDate", "endDate", "duration", "dependencies", "progress"] as const,
  showTaskDateLabels: false,
  showTaskNames: false,
  timelineMarkers: markers,
};

export default function FlowLineDemo() {
  const [sequentialTasks, setSequentialTasks] = useState(() => buildTasks(sequentialFloors(12)));
  const [parallelTasks, setParallelTasks] = useState(() => buildTasks(parallelFloors(12)));

  const mergeTasks = (
    setter: Dispatch<SetStateAction<Task[]>>,
  ) => (changed: Task[]) => {
    setter(current => current.map(task => {
      const update = changed.find(item => item.id === task.id);
      return update ? { ...task, ...update } : task;
    }));
  };

  const handleSequentialChange = useCallback((changed: Task[]) => mergeTasks(setSequentialTasks)(changed), []);
  const handleParallelChange = useCallback((changed: Task[]) => mergeTasks(setParallelTasks)(changed), []);

  return (
    <section className="demo-section" id="gantt-lob">
      <h2 className="demo-section-title">Flow line · работы этажа в одной строке</h2>
      <p className="demo-section-desc">
        Каждая строка — этаж, каждый брусок — работа (<code>task.activities</code>). Полосы двигаются
        и растягиваются с привязкой к дням (связей между работами нет). Последовательные работы
        делят одну дорожку, параллельные разводятся вниз, строка растёт сама.
        Ось — дни от начала проекта; маркер Д 18.
      </p>
      <div className="demo-chart-card">
        <GanttChart
          {...chartProps}
          tasks={sequentialTasks}
          onTasksChange={handleSequentialChange}
          containerHeight={560}
        />
      </div>
      <div className="demo-chart-card">
        <p className="demo-section-desc">
          Те же этажи, но работы заходят друг на друга на день — строки расширяются до 2–3 дорожек.
        </p>
        <GanttChart
          {...chartProps}
          tasks={parallelTasks}
          onTasksChange={handleParallelChange}
          containerHeight={620}
        />
      </div>
    </section>
  );
}

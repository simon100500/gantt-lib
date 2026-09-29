"use client";

import { useCallback, useState } from "react";
import { GanttChart, type Task } from "gantt-lib";

const day = (offset: number) =>
  new Date(Date.UTC(2026, 8, 28 + offset)).toISOString().slice(0, 10);

// Геометрия как на скриншоте пользователя: родитель 112 д, дети по 7 д с трёхнедельными паузами.
const initialTasks: Task[] = [
  {
    id: "house",
    name: "Коробка дома",
    startDate: day(0),
    endDate: day(111),
    composite: true,
    color: "#ef4444",
    progress: 30,
  },
  {
    id: "floor-1",
    parentId: "house",
    name: "Этаж 1",
    startDate: day(0),
    endDate: day(6),
    color: "#ef4444",
    progress: 100,
  },
  {
    id: "floor-2",
    parentId: "house",
    name: "Этаж 2",
    startDate: day(28),
    endDate: day(34),
    color: "#3b82f6",
    progress: 60,
  },
  {
    id: "floor-3",
    parentId: "house",
    name: "Этаж 3",
    startDate: day(56),
    endDate: day(62),
    color: "#3b82f6",
    progress: 20,
  },
  {
    id: "roof",
    parentId: "house",
    name: "Кровля",
    startDate: day(84),
    endDate: day(88),
    color: "#3b82f6",
    progress: 0,
  },
];

export default function CompositeSegmentsDemo() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const handleTasksChange = useCallback((changed: Task[]) => {
    setTasks(current => {
      const changesById = new Map(changed.map(task => [task.id, task]));
      return current.map(task => changesById.get(task.id) ?? task);
    });
  }, []);

  return (
    <section className="demo-section" id="gantt-segments">
      <h2 className="demo-section-title">Composite segments · отсечки в родителе</h2>
      <p className="demo-section-desc">
        Репродукция скриншота: родитель 112 д, дети по 7 д с паузами в три недели.
      </p>
      <div className="demo-chart-card">
        <GanttChart
          tasks={tasks}
          onTasksChange={handleTasksChange}
          showTaskList
          showChart
          businessDays={false}
          dateRange={{ start: new Date(Date.UTC(2026, 8, 21)), end: new Date(Date.UTC(2026, 11, 31)) }}
          dayWidth={36}
          rowHeight={40}
          taskListWidth={280}
          hiddenTaskListColumns={['startDate', 'endDate', 'duration', 'dependencies']}
          containerHeight={360}
          showTaskDateLabels={false}
          showTaskNames
        />
      </div>
    </section>
  );
}

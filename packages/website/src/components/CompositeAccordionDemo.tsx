"use client";

import { useCallback, useState } from "react";
import { GanttChart, type Task } from "gantt-lib";

const day = (offset: number) =>
  new Date(Date.UTC(2026, 8, 28 + offset)).toISOString().slice(0, 10);

const initialTasks: Task[] = [
  {
    id: "laminate",
    name: "Ламинат · 10 этажей",
    startDate: day(0),
    endDate: day(14),
    composite: true,
    color: "#7c3aed",
  },
  ...Array.from({ length: 10 }, (_, index): Task => {
    const start = Math.floor(index / 2) * 3;
    return {
      id: `laminate-floor-${index + 1}`,
      parentId: "laminate",
      name: `Этаж ${index + 1}`,
      startDate: day(start),
      endDate: day(start + 2),
      color: "#8b5cf6",
      synced: true,
    };
  }),
  {
    id: "doors",
    name: "Двери",
    startDate: day(15),
    endDate: day(20),
    color: "#0891b2",
  },
];

export default function CompositeAccordionDemo() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const handleTasksChange = useCallback((changed: Task[]) => {
    setTasks(current => {
      const changesById = new Map(changed.map(task => [task.id, task]));
      return current.map(task => changesById.get(task.id) ?? task);
    });
  }, []);

  return (
    <section className="demo-section" id="gantt-accordion">
      <h2 className="demo-section-title">Gantt Accordion · Ламинат по этажам</h2>
      <p className="demo-section-desc">
        Два этажа выполняются параллельно. Наведите курсор на общую полосу для просмотра,
        нажмите на неё для раскрытия, затем перетащите отдельный этаж или всю работу.
        Строка «Двери» смещается вниз при раскрытии.
      </p>
      <div className="demo-chart-card">
        <GanttChart
          tasks={tasks}
          onTasksChange={handleTasksChange}
          showTaskList
          showChart
          businessDays={false}
          dateRange={{ start: new Date(Date.UTC(2026, 8, 25)), end: new Date(Date.UTC(2026, 9, 22)) }}
          dayWidth={16}
          rowHeight={40}
          taskListWidth={530}
          hiddenTaskListColumns={['startDate', 'endDate', 'duration', 'progress', 'dependencies']}
          containerHeight={570}
          showTaskDateLabels={false}
          showTaskNames={false}
        />
      </div>
    </section>
  );
}

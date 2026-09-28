"use client";

import { useCallback, useState } from "react";
import { GanttChart, type Task } from "gantt-lib";

const day = (offset: number) =>
  new Date(Date.UTC(2026, 8, 28 + offset)).toISOString().slice(0, 10);

const floorWork = (id: string, name: string, count: number, offset: number, color: string, predecessor?: string): Task[] => [
  { id, name: `${name} · ${count} этажей`, startDate: day(offset), endDate: day(offset + Math.floor((count - 1) / 2) * 3 + 2), composite: true, color, progress: Array.from({ length: count }, (_, index) => Math.max(0, 100 - index * 10)).reduce((sum, progress) => sum + progress, 0) / count },
  ...Array.from({ length: count }, (_, index): Task => {
    const start = offset + Math.floor(index / 2) * 3;
    return {
      id: `${id}-floor-${index + 1}`,
      parentId: id,
      name: `Этаж ${index + 1}`,
      startDate: day(start),
      endDate: day(start + 2),
      color,
      progress: Math.max(0, 100 - index * 10),
      synced: true,
      dependencies: predecessor && index === 0 ? [{ taskId: `${predecessor}-floor-${count}`, type: "FS", lag: 0 }] : undefined,
    };
  }),
];

const initialTasks: Task[] = [
  ...floorWork("laminate", "Ламинат", 10, 0, "#7c3aed"),
  ...floorWork("walls", "Отделка стен", 10, 15, "#0891b2", "laminate"),
  ...floorWork("paint", "Покраска", 10, 30, "#d97706", "walls"),
  ...floorWork("lights", "Светильники", 10, 45, "#059669", "paint"),
  {
    id: "doors",
    name: "Двери",
    startDate: day(60),
    endDate: day(63),
    color: "#be185d",
    dependencies: [{ taskId: "lights-floor-10", type: "FS", lag: 0 }],
  },
];

export default function CompositeAccordionDemo() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const latestEnd = Math.max(...tasks.map(task => new Date(task.endDate).getTime()));
  const initialRangeEnd = Date.UTC(2026, 10, 30);
  const rangeEnd = new Date(latestEnd > initialRangeEnd ? latestEnd + 14 * 86400000 : initialRangeEnd);

  const handleTasksChange = useCallback((changed: Task[]) => {
    setTasks(current => {
      const changesById = new Map(changed.map(task => [task.id, task]));
      return current.map(task => changesById.get(task.id) ?? task);
    });
  }, []);

  return (
    <section className="demo-section" id="gantt-accordion">
      <h2 className="demo-section-title">Gantt Accordion · Работы по этажам</h2>
      <p className="demo-section-desc">
        Четыре составные работы на трёхмесячном графике. Наведите курсор на полосу для просмотра этажей,
        нажмите для раскрытия и перетащите работу за правый край графика — шкала продлится автоматически.
        Связи со скрытыми этажами показаны пунктиром.
      </p>
      <div className="demo-chart-card">
        <GanttChart
          tasks={tasks}
          onTasksChange={handleTasksChange}
          showTaskList
          showChart
          businessDays={false}
          dateRange={{ start: new Date(Date.UTC(2026, 8, 1)), end: rangeEnd }}
          dayWidth={16}
          rowHeight={40}
          taskListWidth={530}
          hiddenTaskListColumns={['startDate', 'endDate', 'duration', 'dependencies']}
          containerHeight={570}
          showTaskDateLabels={false}
          showTaskNames
        />
      </div>
    </section>
  );
}

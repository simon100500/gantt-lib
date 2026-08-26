"use client";

import { GanttChart, type Task } from "gantt-lib";

const PARTIAL_TASKS: Task[] = [
  {
    id: "phase-foundation",
    name: "Фундамент",
    startDate: "2026-02-02",
    endDate: "2026-02-20",
    type: "task",
  },
  {
    id: "survey",
    name: "Подготовка площадки",
    startDate: "2026-02-02",
    endDate: "2026-02-05",
    parentId: "phase-foundation",
    type: "task",
  },
  {
    id: "excavation",
    name: "Разработка котлована",
    startDate: "2026-02-06",
    endDate: "2026-02-12",
    parentId: "phase-foundation",
    type: "task",
    dependencies: [{ taskId: "survey", type: "FS", lag: 0 }],
  },
  {
    id: "concrete",
    name: "Бетонирование фундаментной плиты",
    startDate: "2026-02-13",
    endDate: "2026-02-20",
    parentId: "phase-foundation",
    type: "task",
    dependencies: [{ taskId: "excavation", type: "FS", lag: 0 }],
  },
];

export default function GenerationSkeletonDemo() {
  return (
    <section className="demo-section">
      <h2 className="demo-section-title">Streaming generation skeleton</h2>
      <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: "0.9rem" }}>
        The library renders placeholders inside the same task-list and timeline surfaces. Skeleton rows stay below partial tasks while more rows arrive.
      </p>
      <div style={{ display: "grid", gap: "16px" }}>
        <div className="demo-chart-card">
          <h3 style={{ margin: "0 0 12px", color: "#111827", fontSize: "1rem" }}>Empty project</h3>
          <GanttChart
            tasks={[]}
            containerHeight={320}
            rowHeight={36}
            showTaskList
            skeletonRowCount={10}
          />
        </div>
        <div className="demo-chart-card">
          <h3 style={{ margin: "0 0 12px", color: "#111827", fontSize: "1rem" }}>Partial streamed result</h3>
          <GanttChart
            tasks={PARTIAL_TASKS}
            containerHeight={320}
            rowHeight={36}
            showTaskList
            skeletonRowCount={6}
            disableTaskNameEditing
            disableTaskDrag
          />
        </div>
      </div>
    </section>
  );
}

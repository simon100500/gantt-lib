"use client";

import { useState } from "react";
import {
  GanttChart,
  type ResourceTimelineMove,
  type ResourceTimelineResource,
} from "gantt-lib";

type PlannerItem = ResourceTimelineResource["items"][number] & {
  status?: "planned" | "active" | "blocked";
};

const initialResources: Array<ResourceTimelineResource<PlannerItem>> = [
  {
    id: "design",
    name: "Design",
    items: [
      {
        id: "design-brief",
        resourceId: "design",
        title: "Brief + wireframes",
        subtitle: "Client portal",
        startDate: "2026-04-01",
        endDate: "2026-04-04",
        color: "#2563eb",
        status: "active",
      },
      {
        id: "design-review",
        resourceId: "design",
        title: "Visual review",
        subtitle: "Marketing",
        startDate: "2026-04-06",
        endDate: "2026-04-08",
        color: "#0f766e",
        status: "planned",
      },
    ],
  },
  {
    id: "frontend",
    name: "Frontend",
    items: [
      {
        id: "frontend-shell",
        resourceId: "frontend",
        title: "App shell",
        subtitle: "Sprint 12",
        startDate: "2026-04-03",
        endDate: "2026-04-10",
        color: "#7c3aed",
        status: "active",
      },
    ],
  },
  {
    id: "qa",
    name: "QA",
    items: [
      {
        id: "qa-pass",
        resourceId: "qa",
        title: "Regression pass",
        subtitle: "Release candidate",
        startDate: "2026-04-11",
        endDate: "2026-04-15",
        color: "#dc2626",
        status: "blocked",
      },
    ],
  },
  {
    id: "ops",
    name: "Ops",
    items: [],
  },
];

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

export default function ResourcePlannerExample() {
  const [resources, setResources] = useState(initialResources);

  const handleMove = (move: ResourceTimelineMove<PlannerItem>) => {
    setResources((current) => {
      const movedItem = {
        ...move.item,
        resourceId: move.toResourceId,
        startDate: toDateInputValue(move.startDate),
        endDate: toDateInputValue(move.endDate),
      };

      return current.map((resource) => {
        const items = resource.items.filter((item) => item.id !== move.itemId);
        if (resource.id === move.toResourceId) {
          return {
            ...resource,
            items: [...items, movedItem].sort((a, b) => String(a.startDate).localeCompare(String(b.startDate))),
          };
        }
        return { ...resource, items };
      });
    });
  };

  return (
    <section className="demo-section">
      <h2 className="demo-section-title">Resource Planner Mode</h2>
      <p className="demo-section-desc">
        <strong>Resource rows:</strong> drag an item horizontally to shift dates, or vertically to reassign it to another resource.
        Empty resources stay visible, and overlapping items are stacked into lanes.
      </p>
      <div className="demo-chart-card">
        <GanttChart<never, PlannerItem>
          mode="resource-planner"
          resources={resources}
          dayWidth={34}
          laneHeight={42}
          rowHeaderWidth={180}
          maxRenderedDays={35}
          onResourceItemMove={handleMove}
          getItemClassName={(item) => item.status ? `demo-resource-item-${item.status}` : undefined}
          renderItem={(item) => (
            <div className="demo-resource-item-content">
              <span className="demo-resource-item-title">{item.title}</span>
              {item.subtitle && <span className="demo-resource-item-subtitle">{item.subtitle}</span>}
            </div>
          )}
        />
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import {
  GanttChart,
  type ResourceTimelineMove,
  type ResourceTimelineResource,
  type ResourceTimelineResourceMenuCommand,
} from "gantt-lib";

type PlannerItem = ResourceTimelineResource["items"][number] & {
  status?: "planned" | "active" | "blocked";
};

const initialResources: Array<ResourceTimelineResource<PlannerItem>> = [
  {
    id: "earthworks",
    name: "Земляные работы",
    type: "Люди",
    scope: "Shared",
    items: [
      {
        id: "earthworks-site-prep",
        resourceId: "earthworks",
        taskId: "task-earthworks-site-prep",
        title: "Планировка участка",
        subtitle: "Корпус А",
        startDate: "2026-04-01",
        endDate: "2026-04-03",
        color: "#2563eb",
        status: "active",
      },
      {
        id: "earthworks-trench",
        resourceId: "earthworks",
        taskId: "task-earthworks-trench",
        title: "Котлован под фундамент",
        subtitle: "Секция 1",
        startDate: "2026-04-03",
        endDate: "2026-04-10",
        color: "#0f766e",
        status: "planned",
      },
      {
        id: "earthworks-backfill",
        resourceId: "earthworks",
        taskId: "task-earthworks-backfill",
        title: "Обратная засыпка",
        subtitle: "Ось 3-5",
        startDate: "2026-04-14",
        endDate: "2026-04-18",
        color: "#7c3aed",
        status: "blocked",
      },
    ],
  },
  {
    id: "concrete",
    name: "Бетонная бригада",
    type: "Люди",
    scope: "Shared",
    items: [
      {
        id: "concrete-footing",
        resourceId: "concrete",
        taskId: "task-concrete-footing",
        title: "Подбетонка",
        subtitle: "Фундаментная плита",
        startDate: "2026-04-07",
        endDate: "2026-04-09",
        color: "#2563eb",
        status: "active",
      },
      {
        id: "concrete-slab",
        resourceId: "concrete",
        taskId: "task-concrete-slab",
        title: "Заливка плиты",
        subtitle: "Захватка 1",
        startDate: "2026-04-10",
        endDate: "2026-04-15",
        color: "#0f766e",
        status: "blocked",
      },
      {
        id: "concrete-columns",
        resourceId: "concrete",
        taskId: "task-concrete-columns",
        title: "Колонны первого этажа",
        subtitle: "Корпус А",
        startDate: "2026-04-16",
        endDate: "2026-04-23",
        color: "#0f766e",
        status: "planned",
      },
    ],
  },
  {
    id: "rebar",
    name: "Арматурщики",
    type: "Люди",
    scope: "Shared",
    items: [
      {
        id: "rebar-slab",
        resourceId: "rebar",
        taskId: "task-rebar-slab",
        title: "Армирование плиты",
        subtitle: "Нижняя сетка",
        startDate: "2026-04-08",
        endDate: "2026-04-13",
        color: "#7c3aed",
        status: "active",
      },
      {
        id: "rebar-walls",
        resourceId: "rebar",
        taskId: "task-rebar-walls",
        title: "Выпуски под стены",
        subtitle: "Лестничный узел",
        startDate: "2026-04-12",
        endDate: "2026-04-17",
        color: "#0f766e",
        status: "planned",
      },
    ],
  },
  {
    id: "masonry",
    name: "Каменщики",
    type: "Люди",
    scope: "Shared",
    items: [
      {
        id: "masonry-walls-a",
        resourceId: "masonry",
        taskId: "task-masonry-walls-a",
        title: "Кладка наружных стен",
        subtitle: "1 этаж",
        startDate: "2026-04-20",
        endDate: "2026-04-30",
        color: "#2563eb",
        status: "planned",
      },
      {
        id: "masonry-partitions",
        resourceId: "masonry",
        taskId: "task-masonry-partitions",
        title: "Перегородки",
        subtitle: "Секция Б",
        startDate: "2026-04-24",
        endDate: "2026-05-05",
        color: "#7c3aed",
        status: "blocked",
      },
    ],
  },
  {
    id: "crane",
    name: "Башенный кран",
    type: "Оборудование",
    scope: "Shared",
    items: [
      {
        id: "crane-rebar-delivery",
        resourceId: "crane",
        taskId: "task-crane-rebar-delivery",
        title: "Подача арматуры",
        subtitle: "Плита",
        startDate: "2026-04-08",
        endDate: "2026-04-11",
        color: "#0f766e",
        status: "active",
      },
      {
        id: "crane-formwork",
        resourceId: "crane",
        taskId: "task-crane-formwork",
        title: "Перестановка опалубки",
        subtitle: "Колонны",
        startDate: "2026-04-16",
        endDate: "2026-04-22",
        color: "#7c3aed",
        status: "blocked",
      },
      {
        id: "crane-blocks",
        resourceId: "crane",
        taskId: "task-crane-blocks",
        title: "Разгрузка блоков",
        subtitle: "Склад 2",
        startDate: "2026-04-24",
        endDate: "2026-04-28",
        color: "#2563eb",
        status: "planned",
      },
    ],
  },
  {
    id: "electrical",
    name: "Электрики",
    type: "Люди",
    scope: "Project",
    items: [
      {
        id: "electrical-grounding",
        resourceId: "electrical",
        taskId: "task-electrical-grounding",
        title: "Контур заземления",
        subtitle: "Фундамент",
        startDate: "2026-04-06",
        endDate: "2026-04-09",
        color: "#7c3aed",
        status: "planned",
      },
      {
        id: "electrical-rough-in",
        resourceId: "electrical",
        taskId: "task-electrical-rough-in",
        title: "Закладные под кабели",
        subtitle: "Техпомещения",
        startDate: "2026-04-18",
        endDate: "2026-04-25",
        color: "#0f766e",
        status: "active",
      },
    ],
  },
  {
    id: "plumbing",
    name: "Сантехники",
    type: "Люди",
    scope: "Project",
    items: [
      {
        id: "plumbing-sleeves",
        resourceId: "plumbing",
        taskId: "task-plumbing-sleeves",
        title: "Гильзы в фундаменте",
        subtitle: "Ввод воды",
        startDate: "2026-04-09",
        endDate: "2026-04-12",
        color: "#2563eb",
        status: "planned",
      },
      {
        id: "plumbing-drainage",
        resourceId: "plumbing",
        taskId: "task-plumbing-drainage",
        title: "Выпуски канализации",
        subtitle: "Корпус А",
        startDate: "2026-04-13",
        endDate: "2026-04-18",
        color: "#0f766e",
        status: "blocked",
      },
    ],
  },
  {
    id: "finishing",
    name: "Отделочники",
    type: "Материалы",
    scope: "Project",
    items: [
      {
        id: "finishing-mockup",
        resourceId: "finishing",
        taskId: "task-finishing-mockup",
        title: "Образец штукатурки",
        subtitle: "Квартира 12",
        startDate: "2026-05-01",
        endDate: "2026-05-06",
        color: "#7c3aed",
        status: "planned",
      },
    ],
  },
];

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

export default function ResourcePlannerExample() {
  const [resources, setResources] = useState(initialResources);
  const [businessDays, setBusinessDays] = useState(true);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const dayWidth = viewMode === "month" ? 2.5 : viewMode === "week" ? 8 : 24;
  const activeItem = resources.flatMap((resource) => resource.items).find((item) => item.id === activeItemId);
  const activeResource = activeItem
    ? resources.find((resource) => resource.id === activeItem.resourceId)
    : undefined;

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

  const handleAddResource = (resource: ResourceTimelineResource<PlannerItem>) => {
    setResources((current) => [...current, resource]);
  };

  const handleResourceChange = (resource: ResourceTimelineResource<PlannerItem>) => {
    setResources((current) =>
      current.map((item) => item.id === resource.id ? resource : item)
    );
  };

  const resourceMenuCommands: Array<ResourceTimelineResourceMenuCommand<PlannerItem>> = [
    {
      id: "delete-empty-resource",
      label: "Удалить пустой ресурс",
      danger: true,
      isDisabled: (resource) => resource.items.length > 0,
      onSelect: (resource) => {
        setResources((current) => current.filter((item) => item.id !== resource.id));
      },
    },
  ];

  return (
    <section className="demo-section">
      <h2 className="demo-section-title">Resource Planner Mode</h2>
      <p className="demo-section-desc">
        <strong>Ресурсный график строительства:</strong> сдвигайте работы по срокам, растягивайте границы и проверяйте накладки по бригадам и технике.
        В этом примере переназначение между ресурсами заблокировано, чтобы корректировать только даты.
      </p>
      <div className="demo-controls">
        <button
          className={`demo-btn ${businessDays ? "demo-btn-active" : "demo-btn-muted"}`}
          onClick={() => setBusinessDays((value) => !value)}
        >
          {businessDays ? "Рабочие дни: ON" : "Рабочие дни: OFF"}
        </button>
        <button
          className={`demo-btn ${viewMode === "day" ? "demo-btn-active" : "demo-btn-muted"}`}
          onClick={() => setViewMode("day")}
        >
          По дням
        </button>
        <button
          className={`demo-btn ${viewMode === "week" ? "demo-btn-active" : "demo-btn-muted"}`}
          onClick={() => setViewMode("week")}
        >
          По неделям
        </button>
        <button
          className={`demo-btn ${viewMode === "month" ? "demo-btn-active" : "demo-btn-muted"}`}
          onClick={() => setViewMode("month")}
        >
          По месяцам
        </button>
      </div>
      <div className="demo-chart-card">
        <GanttChart<never, PlannerItem>
          mode="resource-planner"
          resources={resources}
          dayWidth={dayWidth}
          viewMode={viewMode}
          laneHeight={42}
          rowHeaderWidth={420}
          businessDays={businessDays}
          disableResourceReassignment
          activeResourceItemId={activeItemId}
          onResourceItemMove={handleMove}
          onResourceItemMenuClick={(item) => setActiveItemId(item.id)}
          onResourceChange={handleResourceChange}
          onAddResource={handleAddResource}
          resourceMenuCommands={resourceMenuCommands}
        />
      </div>
      {activeItem && (
        <aside className="demo-resource-drawer" aria-label="Редактирование назначения">
          <div>
            <div className="demo-resource-drawer-kicker">{activeResource?.name ?? activeItem.resourceId}</div>
            <h3>{activeItem.title}</h3>
            {activeItem.subtitle && <p>{activeItem.subtitle}</p>}
          </div>
          <dl>
            <div>
              <dt>Старт</dt>
              <dd>{String(activeItem.startDate)}</dd>
            </div>
            <div>
              <dt>Финиш</dt>
              <dd>{String(activeItem.endDate)}</dd>
            </div>
            <div>
              <dt>Статус</dt>
              <dd>{activeItem.status ?? "planned"}</dd>
            </div>
          </dl>
          <button className="demo-btn demo-btn-neutral" type="button" onClick={() => setActiveItemId(null)}>
            Закрыть
          </button>
        </aside>
      )}
    </section>
  );
}

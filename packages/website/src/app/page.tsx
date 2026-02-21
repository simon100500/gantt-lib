"use client";

import { useState, useCallback } from "react";
import { GanttChart, type Task } from "gantt-lib";

const createSampleTasks = (): Task[] => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const pad = (n: number) => String(n + 1).padStart(2, "0");
  const addDays = (date: string, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };
  const baseDate = `${y}-${pad(m)}-01`;

  return [
    // === ПОДГОТОВИТЕЛЬНЫЙ ЭТАП ===
    {
      id: "1",
      name: "Геодезическая разбивка площадки",
      startDate: baseDate,
      endDate: addDays(baseDate, 3),
      color: "#3b82f6",
      progress: 100,
      accepted: true,
    },
    {
      id: "2",
      name: "Ограждение строительной площадки",
      startDate: addDays(baseDate, 1),
      endDate: addDays(baseDate, 6),
      color: "#6366f1",
      progress: 100,
    },
    {
      id: "3",
      name: "Временные дороги и подъезды",
      startDate: addDays(baseDate, 3),
      endDate: addDays(baseDate, 11),
      color: "#6366f1",
      progress: 75,
    },
    {
      id: "4",
      name: "Бытовые помещения для рабочих",
      startDate: addDays(baseDate, 4),
      endDate: addDays(baseDate, 8),
      color: "#8b5cf6",
      progress: 45.7,
    },
    {
      id: "5",
      name: "Подключение электричества временного",
      startDate: addDays(baseDate, 6),
      endDate: addDays(baseDate, 14),
      color: "#8b5cf6",
      progress: 20,
    },
    {
      id: "6",
      name: "Водоснабжение временное",
      startDate: addDays(baseDate, 8),
      endDate: addDays(baseDate, 13),
      color: "#a855f7",
      progress: 0,
    },
    {
      id: "7",
      name: "Мобильный кран и подъемное оборудование",
      startDate: addDays(baseDate, 11),
      endDate: addDays(baseDate, 16),
      color: "#a855f7",
    },

    // === НУЛЕВОЙ ЦИКЛ ===
    {
      id: "8",
      name: "Вывоз гумуса и сохранение плодородного слоя",
      startDate: addDays(baseDate, 11),
      endDate: addDays(baseDate, 18),
      color: "#ec4899",
      progress: 100,
      accepted: true,
    },
    {
      id: "9",
      name: "Срезка растительного слоя",
      startDate: addDays(baseDate, 14),
      endDate: addDays(baseDate, 21),
      color: "#ec4899",
      progress: 100,
    },
    {
      id: "10",
      name: "Планировка площадки",
      startDate: addDays(baseDate, 19),
      endDate: addDays(baseDate, 26),
      color: "#f43f5e",
      progress: 85,
    },
    {
      id: "11",
      name: "Разработка котлована экскаватором",
      startDate: addDays(baseDate, 21),
      endDate: addDays(baseDate, 34),
      color: "#f43f5e",
      progress: 60,
    },
    {
      id: "12",
      name: "Уплотнение основания котлована",
      startDate: addDays(baseDate, 33),
      endDate: addDays(baseDate, 38),
      color: "#f97316",
      progress: 30,
    },
    {
      id: "13",
      name: "Устройство песчаной подушки",
      startDate: addDays(baseDate, 36),
      endDate: addDays(baseDate, 43),
      color: "#f97316",
      progress: 150,
    },
    {
      id: "14",
      name: "Бетонная подготовка под фундамент",
      startDate: addDays(baseDate, 41),
      endDate: addDays(baseDate, 48),
      color: "#fb923c",
      progress: -10,
    },

    // === ФУНДАМЕНТ ===
    {
      id: "15",
      name: "Армирование подошвы фундамента",
      startDate: addDays(baseDate, 46),
      endDate: addDays(baseDate, 54),
      color: "#eab308",
    },
    {
      id: "16",
      name: "Бетонирование подошвы фундамента",
      startDate: addDays(baseDate, 53),
      endDate: addDays(baseDate, 58),
      color: "#eab308",
    },
    {
      id: "17",
      name: "Уход за бетоном (7 дней)",
      startDate: addDays(baseDate, 56),
      endDate: addDays(baseDate, 63),
      color: "#ca8a04",
    },
    {
      id: "18",
      name: "Монтаж опалубки стен подвала",
      startDate: addDays(baseDate, 61),
      endDate: addDays(baseDate, 71),
      color: "#84cc16",
    },
    {
      id: "19",
      name: "Армирование стен подвала",
      startDate: addDays(baseDate, 68),
      endDate: addDays(baseDate, 78),
      color: "#84cc16",
    },
    {
      id: "20",
      name: "Бетонирование стен подвала",
      startDate: addDays(baseDate, 76),
      endDate: addDays(baseDate, 83),
      color: "#65a30d",
    },
    {
      id: "21",
      name: "Гидроизоляция фундамента",
      startDate: addDays(baseDate, 86),
      endDate: addDays(baseDate, 96),
      color: "#22c55e",
    },
    {
      id: "22",
      name: "Теплоизоляция фундамента",
      startDate: addDays(baseDate, 94),
      endDate: addDays(baseDate, 101),
      color: "#16a34a",
    },
    {
      id: "23",
      name: "Обратная засыпка пазух",
      startDate: addDays(baseDate, 99),
      endDate: addDays(baseDate, 108),
      color: "#15803d",
    },
    {
      id: "24",
      name: "Устройство отмостки",
      startDate: addDays(baseDate, 131),
      endDate: addDays(baseDate, 141),
      color: "#166534",
    },

    // === СТЕНЫ И ПЕРЕГОРОДКИ ===
    {
      id: "25",
      name: "Кладка наружных стен (1 этаж)",
      startDate: addDays(baseDate, 106),
      endDate: addDays(baseDate, 126),
      color: "#14b8a6",
    },
    {
      id: "26",
      name: "Кладка внутренних стен (1 этаж)",
      startDate: addDays(baseDate, 116),
      endDate: addDays(baseDate, 134),
      color: "#14b8a6",
    },
    {
      id: "27",
      name: "Монтаж перемычек",
      startDate: addDays(baseDate, 131),
      endDate: addDays(baseDate, 141),
      color: "#0d9488",
    },
    {
      id: "28",
      name: "Кладка наружных стен (2 этаж)",
      startDate: addDays(baseDate, 136),
      endDate: addDays(baseDate, 156),
      color: "#0891b2",
    },
    {
      id: "29",
      name: "Кладка внутренних стен (2 этаж)",
      startDate: addDays(baseDate, 144),
      endDate: addDays(baseDate, 161),
      color: "#0891b2",
    },
    {
      id: "30",
      name: "Устройство армопояса",
      startDate: addDays(baseDate, 158),
      endDate: addDays(baseDate, 166),
      color: "#0284c7",
    },
    {
      id: "31",
      name: "Монтаж плит перекрытия 1 этажа",
      startDate: addDays(baseDate, 164),
      endDate: addDays(baseDate, 171),
      color: "#0284c7",
    },
    {
      id: "32",
      name: "Монтаж плит перекрытия 2 этажа",
      startDate: addDays(baseDate, 171),
      endDate: addDays(baseDate, 178),
      color: "#0369a1",
    },
    {
      id: "33",
      name: "Кладка наружных стен (3 этаж/мансарда)",
      startDate: addDays(baseDate, 178),
      endDate: addDays(baseDate, 196),
      color: "#075985",
    },
    {
      id: "34",
      name: "Устройство стропильной системы",
      startDate: addDays(baseDate, 194),
      endDate: addDays(baseDate, 211),
      color: "#0c4a6e",
    },

    // === КРОВЛЯ ===
    {
      id: "35",
      name: "Монтаж обрешетки",
      startDate: addDays(baseDate, 208),
      endDate: addDays(baseDate, 218),
      color: "#dc2626",
    },
    {
      id: "36",
      name: "Укладка подкладочного ковра",
      startDate: addDays(baseDate, 216),
      endDate: addDays(baseDate, 224),
      color: "#dc2626",
    },
    {
      id: "37",
      name: "Монтаж водосточной системы",
      startDate: addDays(baseDate, 221),
      endDate: addDays(baseDate, 231),
      color: "#b91c1c",
    },
    {
      id: "38",
      name: "Укладка кровельного покрытия",
      startDate: addDays(baseDate, 224),
      endDate: addDays(baseDate, 244),
      color: "#991b1b",
    },
    {
      id: "39",
      name: "Утепление кровли",
      startDate: addDays(baseDate, 241),
      endDate: addDays(baseDate, 254),
      color: "#7f1d1d",
    },
    {
      id: "40",
      name: "Монтаж окон (2 этаж, мансарда)",
      startDate: addDays(baseDate, 246),
      endDate: addDays(baseDate, 258),
      color: "#450a0a",
    },

    // === ОКОНА И ДВЕРИ ===
    {
      id: "41",
      name: "Монтаж окон (1 этаж)",
      startDate: addDays(baseDate, 196),
      endDate: addDays(baseDate, 211),
      color: "#7c3aed",
    },
    {
      id: "42",
      name: "Установка входной двери",
      startDate: addDays(baseDate, 254),
      endDate: addDays(baseDate, 258),
      color: "#6d28d9",
    },
    {
      id: "43",
      name: "Установка межкомнатных дверей",
      startDate: addDays(baseDate, 306),
      endDate: addDays(baseDate, 321),
      color: "#5b21b6",
    },

    // === ИНЖЕНЕРНЫЕ СИСТЕМЫ ===
    {
      id: "44",
      name: "Разводка электрики (штробы)",
      startDate: addDays(baseDate, 256),
      endDate: addDays(baseDate, 276),
      color: "#db2777",
    },
    {
      id: "45",
      name: "Прокладка электрических кабелей",
      startDate: addDays(baseDate, 271),
      endDate: addDays(baseDate, 291),
      color: "#db2777",
    },
    {
      id: "46",
      name: "Монтаж водопровода",
      startDate: addDays(baseDate, 276),
      endDate: addDays(baseDate, 296),
      color: "#be185d",
    },
    {
      id: "47",
      name: "Монтаж канализации",
      startDate: addDays(baseDate, 281),
      endDate: addDays(baseDate, 301),
      color: "#be185d",
    },
    {
      id: "48",
      name: "Монтаж отопления (радиаторы)",
      startDate: addDays(baseDate, 291),
      endDate: addDays(baseDate, 311),
      color: "#9d174d",
    },
    {
      id: "49",
      name: "Установка котла",
      startDate: addDays(baseDate, 306),
      endDate: addDays(baseDate, 314),
      color: "#9d174d",
    },
    {
      id: "50",
      name: "Монтаж вентиляции",
      startDate: addDays(baseDate, 301),
      endDate: addDays(baseDate, 316),
      color: "#831843",
    },
    {
      id: "51",
      name: "Установка сантехприборов",
      startDate: addDays(baseDate, 346),
      endDate: addDays(baseDate, 361),
      color: "#701a75",
    },

    // === ВНУТРЕННЯЯ ОТДЕЛКА ===
    {
      id: "52",
      name: "Штукатурка стен",
      startDate: addDays(baseDate, 316),
      endDate: addDays(baseDate, 341),
      color: "#ea580c",
    },
    {
      id: "53",
      name: "Стяжка пола",
      startDate: addDays(baseDate, 336),
      endDate: addDays(baseDate, 356),
      color: "#ea580c",
    },
    {
      id: "54",
      name: "Грунтовка стен и потолков",
      startDate: addDays(baseDate, 356),
      endDate: addDays(baseDate, 366),
      color: "#c2410c",
    },
    {
      id: "55",
      name: "Покраска потолков",
      startDate: addDays(baseDate, 364),
      endDate: addDays(baseDate, 376),
      color: "#c2410c",
    },
    {
      id: "56",
      name: "Поклейка обоев",
      startDate: addDays(baseDate, 374),
      endDate: addDays(baseDate, 391),
      color: "#9a3412",
    },
    {
      id: "57",
      name: "Укладка напольного покрытия",
      startDate: addDays(baseDate, 386),
      endDate: addDays(baseDate, 406),
      color: "#9a3412",
    },
    {
      id: "58",
      name: "Установка плинтусов",
      startDate: addDays(baseDate, 404),
      endDate: addDays(baseDate, 411),
      color: "#7c2d12",
    },
    {
      id: "59",
      name: "Монтаж электрических розеток и выключателей",
      startDate: addDays(baseDate, 361),
      endDate: addDays(baseDate, 371),
      color: "#7c2d12",
    },

    // === ФАСАД И БЛАГОУСТРОЙСТВО ===
    {
      id: "60",
      name: "Штукатурка фасада",
      startDate: addDays(baseDate, 366),
      endDate: addDays(baseDate, 396),
      color: "#475569",
    },
    {
      id: "61",
      name: "Окраска фасада",
      startDate: addDays(baseDate, 394),
      endDate: addDays(baseDate, 416),
      color: "#475569",
    },
    {
      id: "62",
      name: "Благоустройство территории",
      startDate: addDays(baseDate, 411),
      endDate: addDays(baseDate, 436),
      color: "#334155",
    },
    {
      id: "63",
      name: "Установка забора",
      startDate: addDays(baseDate, 426),
      endDate: addDays(baseDate, 441),
      color: "#1e293b",
    },
    {
      id: "64",
      name: "Озеленение участка",
      startDate: addDays(baseDate, 436),
      endDate: addDays(baseDate, 456),
      color: "#0f172a",
    },
  ];
};

// Sample tasks with dependencies demonstrating all link types
const createDependencyTasks = (): Task[] => {
  return [
    // Simple chain: 5 tasks with FS dependencies one after another
    {
      id: 'task-1',
      name: 'Task 1',
      startDate: '2026-02-01',
      endDate: '2026-02-03',
      color: '#3b82f6',
    },
    {
      id: 'task-2',
      name: 'Task 2',
      startDate: '2026-02-04',
      endDate: '2026-02-06',
      color: '#10b981',
      dependencies: [{ taskId: 'task-1', type: 'FS' as const }],
    },
    {
      id: 'task-3',
      name: 'Task 3',
      startDate: '2026-02-07',
      endDate: '2026-02-09',
      color: '#f59e0b',
      dependencies: [{ taskId: 'task-2', type: 'FS' as const }],
    },
    {
      id: 'task-4',
      name: 'Task 4',
      startDate: '2026-02-10',
      endDate: '2026-02-12',
      color: '#ef4444',
      dependencies: [{ taskId: 'task-3', type: 'FS' as const }],
    },
    {
      id: 'task-5',
      name: 'Task 5',
      startDate: '2026-02-13',
      endDate: '2026-02-15',
      color: '#8b5cf6',
      dependencies: [{ taskId: 'task-4', type: 'FS' as const }],
    },

    // FS with negative lag test case
    {
      id: 'task-fs-parent',
      name: 'FS Parent',
      startDate: '2026-02-17',
      endDate: '2026-02-20',
      color: '#0ea5e9',
    },
    {
      id: 'task-fs-child',
      name: 'FS Child (lag=-3)',
      startDate: '2026-02-18',
      endDate: '2026-02-21',
      color: '#06b6d4',
      dependencies: [{ taskId: 'task-fs-parent', type: 'FS' as const, lag: -3 }],
    },

    // Circular dependency (for demonstration - highlighted in red)
    {
      id: 'cycle-a',
      name: 'Cycle A',
      startDate: '2026-02-08',
      endDate: '2026-02-10',
      color: '#f97316',
      dependencies: [{ taskId: 'cycle-b', type: 'FS' as const }],
    },
    {
      id: 'cycle-b',
      name: 'Cycle B',
      startDate: '2026-02-08',
      endDate: '2026-02-10',
      color: '#a855f7',
      dependencies: [{ taskId: 'cycle-a', type: 'FS' as const }],
    },
  ];
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(createSampleTasks);
  const [dependencyTasks, setDependencyTasks] = useState<Task[]>(createDependencyTasks);
  const [blockConstraints, setBlockConstraints] = useState(true);

  const handleChange = useCallback(
    (updated: Task[] | ((t: Task[]) => Task[])) =>
      setTasks(typeof updated === "function" ? updated : () => updated),
    [],
  );

  const handleDependencyChange = useCallback(
    (updated: Task[] | ((t: Task[]) => Task[])) =>
      setDependencyTasks(typeof updated === "function" ? updated : () => updated),
    [],
  );

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>gantt-lib demo</h1>
      <p style={{ marginBottom: "2rem", color: "#6b7280" }}>
        Drag task bars to move or resize. Install:{" "}
        <code>npm install gantt-lib</code>
      </p>

      {/* Main Demo */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>
          Construction Project
        </h2>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          <GanttChart
            tasks={tasks}
            dayWidth={24}
            rowHeight={36}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Dependencies Demo */}
      <div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>
          Task Dependencies
        </h2>
        <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
          Tasks can have dependencies with 4 link types (FS, SS, FF, SF) and optional lag.
          Circular dependencies are highlighted in red.
        </p>
        <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={blockConstraints}
              onChange={(e) => setBlockConstraints(e.target.checked)}
              style={{ marginRight: '0.375rem' }}
            />
            Block constraints during drag
          </label>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            (uncheck to drag freely past dependency boundaries)
          </span>
        </div>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          <GanttChart
            tasks={dependencyTasks}
            onChange={handleDependencyChange}
            dayWidth={24}
            rowHeight={36}
            disableConstraints={!blockConstraints}
            onValidateDependencies={(result) => {
              if (!result.isValid) {
                console.log('Dependency validation:', result.errors);
              }
            }}
          />
        </div>
      </div>
    </main>
  );
}

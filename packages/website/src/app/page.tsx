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
      name: "Ограждение и временные дороги",
      startDate: addDays(baseDate, 1),
      endDate: addDays(baseDate, 7),
      // color: "#6366f1",
      progress: 100,
      dependencies: [{ taskId: '1', type: 'FS', lag: 0 }], // SS лаг = 0
    },
    {
      id: "3",
      name: "Подключение временных коммуникаций",
      startDate: addDays(baseDate, 5),
      endDate: addDays(baseDate, 12),
      // color: "#8b5cf6",
      progress: 80,
      dependencies: [{ taskId: '2', type: 'FS', lag: 20 }], // FS лаг = 0
    },

    // === НУЛЕВОЙ ЦИКЛ ===
    {
      id: "4",
      name: "Разработка котлована",
      startDate: addDays(baseDate, 10),
      endDate: addDays(baseDate, 22),
      dependencies: [{ taskId: '3', type: 'FS', lag: 3 }], // FS +3 дня (технологический перерыв)
    },
    {
      id: "5",
      name: "Устройство песчаной подушки и бетонная подготовка",
      startDate: addDays(baseDate, 23),
      endDate: addDays(baseDate, 30),
      progress: 90,
      dependencies: [{ taskId: '4', type: 'FS', lag: 0 }],
    },

    // === ФУНДАМЕНТ ===
    {
      id: "6",
      name: "Армирование и бетонирование фундамента",
      startDate: addDays(baseDate, 28),
      endDate: addDays(baseDate, 40),
      color: "#eab308",
      progress: 75,
      dependencies: [
        // { taskId: '5', type: 'SS', lag: 0 }, // SS лаг = 0 (параллельно)
        { taskId: '5', type: 'FF', lag: 0 }  // FF лаг = 0 (финиш синхронизирован)
      ],
    },
    {
      id: "7",
      name: "Гидроизоляция и обратная засыпка",
      startDate: addDays(baseDate, 41),
      endDate: addDays(baseDate, 52),
      color: "#22c55e",
      progress: 60,
      dependencies: [{ taskId: '6', type: 'FS', lag: -3 }], // FS -3 дня (перекрытие работ)
    },

    // === КОРОБКА ЗДАНИЯ ===
    {
      id: "8",
      name: "Возведение стен 1-2 этажа",
      startDate: addDays(baseDate, 45),
      endDate: addDays(baseDate, 75),
      color: "#14b8a6",
      progress: 50,
      dependencies: [{ taskId: '7', type: 'FS', lag: 0 }],
    },
    {
      id: "9",
      name: "Монтаж плит перекрытия",
      startDate: addDays(baseDate, 65),
      endDate: addDays(baseDate, 78),
      color: "#0891b2",
      progress: 40,
      dependencies: [{ taskId: '8', type: 'SS', lag: 0 }], // SS лаг = 0
    },
    {
      id: "10",
      name: "Устройство стропильной системы",
      startDate: addDays(baseDate, 76),
      endDate: addDays(baseDate, 92),
      color: "#0c4a6e",
      progress: 30,
      dependencies: [{ taskId: '9', type: 'FS', lag: 0 }],
    },

    // === КРОВЛЯ ===
    {
      id: "11",
      name: "Монтаж кровельного покрытия",
      startDate: addDays(baseDate, 90),
      endDate: addDays(baseDate, 110),
      color: "#dc2626",
      progress: 20,
      dependencies: [
        { taskId: '10', type: 'FS', lag: -3 }, // FS -3 дня (начало до финиша предшественника)
        { taskId: '10', type: 'FF', lag: 0 }   // FF лаг = 0
      ],
    },

    // === ОКНА И ФАСАД ===
    {
      id: "12",
      name: "Монтаж оконных блоков",
      startDate: addDays(baseDate, 95),
      endDate: addDays(baseDate, 112),
      color: "#7c3aed",
      progress: 15,
      dependencies: [{ taskId: '11', type: 'FS', lag: 3 }], // FS +3 дня (после кровли)
    },
    {
      id: "13",
      name: "Устройство фасада",
      startDate: addDays(baseDate, 105),
      endDate: addDays(baseDate, 135),
      color: "#475569",
      progress: 10,
      dependencies: [{ taskId: '12', type: 'SS', lag: 0 }], // SS лаг = 0
    },

    // === ИНЖЕНЕРНЫЕ СИСТЕМЫ ===
    {
      id: "14",
      name: "Разводка инженерных сетей (электрика, вода, отопление)",
      startDate: addDays(baseDate, 100),
      endDate: addDays(baseDate, 140),
      color: "#db2777",
      progress: 25,
      dependencies: [{ taskId: '8', type: 'FS', lag: 0 }], // после возведения стен
    },

    // === ВНУТРЕННЯЯ ОТДЕЛКА ===
    {
      id: "15",
      name: "Штукатурка и стяжка",
      startDate: addDays(baseDate, 130),
      endDate: addDays(baseDate, 160),
      color: "#ea580c",
      progress: 5,
      dependencies: [
        { taskId: '14', type: 'FS', lag: 0 },
        { taskId: '13', type: 'FS', lag: -3 } // можно начать до финиша фасада
      ],
    },
    {
      id: "16",
      name: "Чистовая отделка (обои, покраска, полы)",
      startDate: addDays(baseDate, 158),
      endDate: addDays(baseDate, 190),
      color: "#9a3412",
      progress: 0,
      dependencies: [{ taskId: '15', type: 'FS', lag: 0 }],
    },
    {
      id: "17",
      name: "Установка сантехники и электрики (финиш)",
      startDate: addDays(baseDate, 180),
      endDate: addDays(baseDate, 200),
      color: "#701a75",
      progress: 0,
      dependencies: [{ taskId: '16', type: 'SS', lag: 0 }], // SS лаг = 0
    },

    // === ФИНАЛЬНЫЙ ЭТАП ===
    {
      id: "18",
      name: "Благоустройство территории",
      startDate: addDays(baseDate, 185),
      endDate: addDays(baseDate, 210),
      color: "#334155",
      progress: 0,
      dependencies: [{ taskId: '13', type: 'FS', lag: 0 }],
    },
    {
      id: "19",
      name: "Пусконаладочные работы",
      startDate: addDays(baseDate, 195),
      endDate: addDays(baseDate, 205),
      color: "#1e293b",
      progress: 0,
      dependencies: [
        { taskId: '17', type: 'FS', lag: 0 },
        { taskId: '16', type: 'FF', lag: 0 } // FF лаг = 0
      ],
    },
    {
      id: "20",
      name: "Сдача объекта",
      startDate: addDays(baseDate, 210),
      endDate: addDays(baseDate, 215),
      color: "#0f172a",
      progress: 0,
      dependencies: [
        { taskId: '18', type: 'FS', lag: 0 },
        { taskId: '19', type: 'FS', lag: 0 }
      ],
    },

    // === SS DEMO: Site Preparation → Foundation Work (lag=2) ===
    {
      id: "ss-site-prep",
      name: "Site Preparation",
      startDate: addDays(baseDate, 220),
      endDate: addDays(baseDate, 226),
      color: '#8b5cf6',
      progress: 0,
    },
    {
      id: "ss-foundation",
      name: "Foundation Work",
      startDate: addDays(baseDate, 222),
      endDate: addDays(baseDate, 234),
      color: '#6d28d9',
      progress: 0,
      dependencies: [{ taskId: 'ss-site-prep', type: 'SS', lag: 2 }],
    },

    // === FF DEMO: Framing & Structure → Interior Finishing (lag=3) ===
    {
      id: "ff-framing-structure",
      name: "Framing & Structure",
      startDate: addDays(baseDate, 235),
      endDate: addDays(baseDate, 251),
      color: '#f59e0b',
      progress: 0,
    },
    {
      id: "ff-interior-finishing",
      name: "Interior Finishing",
      startDate: addDays(baseDate, 240),
      endDate: addDays(baseDate, 254),
      color: '#d97706',
      progress: 0,
      dependencies: [{ taskId: 'ff-framing-structure', type: 'FF', lag: 3 }],
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
      id: 'task-3',
      name: 'Task 3',
      startDate: '2026-02-07',
      endDate: '2026-02-09',
      color: '#f59e0b',
      dependencies: [{ taskId: 'task-2', type: 'FS' as const }],
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


  ];
};

// Cascade demo: A->B->C chain for Phase 7 cascade demonstration
const createCascadeTasks = (): Task[] => {
  return [
    {
      id: 'cascade-a',
      name: 'Задача A (перетащи меня)',
      startDate: '2026-02-01',
      endDate: '2026-02-05',
      color: '#3b82f6',
    },
    {
      id: 'cascade-b',
      name: 'Задача B (FS+0)',
      startDate: '2026-02-06',
      endDate: '2026-02-10',
      color: '#10b981',
      dependencies: [{ taskId: 'cascade-a', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'cascade-c',
      name: 'Задача C (FS+0)',
      startDate: '2026-02-11',
      endDate: '2026-02-15',
      color: '#f59e0b',
      dependencies: [{ taskId: 'cascade-b', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'cascade-d',
      name: 'Задача D (независимая)',
      startDate: '2026-02-08',
      endDate: '2026-02-12',
      color: '#8b5cf6',
    },
  ];
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(createSampleTasks);
  const [dependencyTasks, setDependencyTasks] = useState<Task[]>(createDependencyTasks);
  const [cascadeTasks, setCascadeTasks] = useState<Task[]>(createCascadeTasks);
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

  const handleCascadeChange = useCallback(
    (updated: Task[] | ((t: Task[]) => Task[])) =>
      setCascadeTasks(typeof updated === "function" ? updated : () => updated),
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
      <div style={{ marginBottom: "3rem" }}>
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

      {/* Cascade Demo (Phase 7) */}
      <div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>
          Каскадное смещение (Phase 7)
        </h2>
        <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
          Жесткий режим: перетащи «Задача A» — B и C двигаются вместе в реальном времени.
          D — независимая, не смещается. После отпускания проверь консоль.
        </p>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          <GanttChart
            tasks={cascadeTasks}
            onChange={handleCascadeChange}
            onCascade={(shifted) => console.log('Cascade:', shifted.map(t => `${t.name}: ${t.startDate}`))}
            dayWidth={40}
            rowHeight={40}
            containerHeight={250}
          />
        </div>
      </div>
    </main>
  );
}

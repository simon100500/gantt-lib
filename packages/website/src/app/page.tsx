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
      progress: 100,
      accepted: true,
    },
    {
      id: "2",
      name: "Ограждение и временные дороги",
      startDate: addDays(baseDate, 11),
      endDate: addDays(baseDate, 14),
      progress: 100,
      dependencies: [{ taskId: '1', type: 'SS' }],
    },
    {
      id: "3",
      name: "Подключение временных коммуникаций",
      startDate: addDays(baseDate, 7),
      endDate: addDays(baseDate, 10),
      progress: 90,
      dependencies: [{ taskId: '2', type: 'SF' }],
    },

    // === НУЛЕВОЙ ЦИКЛ ===
    {
      id: "4",
      name: "Разработка котлована",
      startDate: addDays(baseDate, 17), // +3 дня лаг после предшественника
      endDate: addDays(baseDate, 30),
      progress: 100,
      dependencies: [{ taskId: '2', type: 'FS', lag: 3 }], // Пример FS +3
    },
    {
      id: "5",
      name: "Песчаная подушка",
      startDate: addDays(baseDate, 30),
      endDate: addDays(baseDate, 37),
      progress: 95,
      dependencies: [{ taskId: '4', type: 'FS', lag: 0 }],
    },
    {
      id: "6",
      name: "Бетонная подготовка",
      startDate: addDays(baseDate, 37),
      endDate: addDays(baseDate, 42),
      color: "#fb923c",
      progress: 90,
      dependencies: [{ taskId: '5', type: 'FS', lag: 0 }],
    },

    // === ФУНДАМЕНТ ===
    {
      id: "7",
      name: "Армирование фундамента",
      startDate: addDays(baseDate, 42),
      endDate: addDays(baseDate, 50),
      color: "#eab308",
      progress: 80,
      dependencies: [{ taskId: '6', type: 'FS', lag: 0 }],
    },
    {
      id: "8",
      name: "Бетонирование фундамента",
      startDate: addDays(baseDate, 45),
      endDate: addDays(baseDate, 50),
      color: "#ca8a04",
      progress: 75,
      dependencies: [{ taskId: '7', type: 'FF', lag: 0 }], // FF: финиш синхронизирован
    },
    {
      id: "9",
      name: "Уход за бетоном (7 дней)",
      startDate: addDays(baseDate, 50),
      endDate: addDays(baseDate, 57),
      color: "#a16207",
      progress: 70,
      dependencies: [{ taskId: '8', type: 'FS', lag: 0 }],
    },
    {
      id: "10",
      name: "Гидроизоляция фундамента",
      startDate: addDays(baseDate, 57),
      endDate: addDays(baseDate, 65),
      color: "#22c55e",
      progress: 65,
      dependencies: [{ taskId: '9', type: 'FS', lag: 0 }],
    },

    // === КОРОБКА ЗДАНИЯ ===
    {
      id: "11",
      name: "Возведение стен 1-2 этажа",
      startDate: addDays(baseDate, 65),
      endDate: addDays(baseDate, 95),
      color: "#14b8a6",
      progress: 50,
      dependencies: [{ taskId: '10', type: 'FS', lag: 0 }],
    },
    {
      id: "12",
      name: "Монтаж плит перекрытия",
      startDate: addDays(baseDate, 65),
      endDate: addDays(baseDate, 80),
      color: "#0d9488",
      progress: 45,
      dependencies: [{ taskId: '11', type: 'SS', lag: 0 }], // SS: старт параллельно
    },
    {
      id: "13",
      name: "Устройство стропильной системы",
      startDate: addDays(baseDate, 80),
      endDate: addDays(baseDate, 95),
      color: "#0891b2",
      progress: 40,
      dependencies: [{ taskId: '12', type: 'FS', lag: 0 }],
    },

    // === КРОВЛЯ ===
    {
      id: "14",
      name: "Монтаж кровельного покрытия",
      startDate: addDays(baseDate, 95),
      endDate: addDays(baseDate, 115),
      color: "#dc2626",
      progress: 30,
      dependencies: [{ taskId: '13', type: 'FS', lag: 0 }],
    },
    {
      id: "15",
      name: "Монтаж оконных блоков",
      startDate: addDays(baseDate, 118), // +3 дня лаг после кровли
      endDate: addDays(baseDate, 135),
      color: "#7c3aed",
      progress: 25,
      dependencies: [{ taskId: '14', type: 'FS', lag: 3 }], // Пример FS +3
    },

    // === ФАСАД И ИНЖЕНЕРИЯ ===
    {
      id: "16",
      name: "Устройство фасада",
      startDate: addDays(baseDate, 118),
      endDate: addDays(baseDate, 150),
      color: "#475569",
      progress: 20,
      dependencies: [{ taskId: '15', type: 'SS', lag: 0 }],
    },
    {
      id: "17",
      name: "Разводка инженерных сетей",
      startDate: addDays(baseDate, 95),
      endDate: addDays(baseDate, 125),
      color: "#db2777",
      progress: 35,
      dependencies: [{ taskId: '11', type: 'FS', lag: 0 }],
    },

    // === ВНУТРЕННЯЯ ОТДЕЛКА ===
    {
      id: "18",
      name: "Штукатурка и стяжка",
      startDate: addDays(baseDate, 125),
      endDate: addDays(baseDate, 155),
      color: "#ea580c",
      progress: 15,
      dependencies: [{ taskId: '17', type: 'FS', lag: 0 }],
    },
    {
      id: "19",
      name: "Чистовая отделка",
      startDate: addDays(baseDate, 152), // -3 дня: начало до финиша предшественника
      endDate: addDays(baseDate, 180),
      color: "#9a3412",
      progress: 5,
      dependencies: [{ taskId: '18', type: 'FS', lag: -3 }], // Пример FS -3 (перекрытие)
    },

    // === ФИНАЛ ===
    {
      id: "20",
      name: "Сдача объекта",
      startDate: addDays(baseDate, 180),
      endDate: addDays(baseDate, 185),
      color: "#0f172a",
      progress: 0,
      dependencies: [{ taskId: '19', type: 'FS', lag: 0 }],
    },

    // === SF ДЕМО: ЛИФТОВАЯ ОБОРУДОВАНИЕ ===
    {
      id: "sf-1",
      name: "Установка лифта (SF predecessor)",
      startDate: addDays(baseDate, 150),
      endDate: addDays(baseDate, 165),
      color: "#3b82f6",
      progress: 0,
    },
    {
      id: "sf-2",
      name: "Поставка лифтового оборудования (SF successor)",
      startDate: addDays(baseDate, 105),
      endDate: addDays(baseDate, 150), // 45 дней на логистику
      color: "#10b981",
      progress: 0,
      dependencies: [
        { taskId: 'sf-1', type: 'SF', lag: 0 }
      ],
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

// Генератор 100 задач с FS-зависимостями и лагом +2 дня
const createChain100Tasks = (): Task[] => {
  const baseDate = new Date('2026-02-01');
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const tasks: Task[] = [];
  const taskDuration = 3; // длительность каждой задачи в днях
  const lag = 2; // лаг между задачами

  // Генерируем цепочку из 100 задач
  let currentDate = baseDate;
  for (let i = 1; i <= 100; i++) {
    const startDate = formatDate(currentDate);
    const endDate = formatDate(addDays(currentDate, taskDuration - 1));

    const task: Task = {
      id: `chain-${i}`,
      name: `Задача ${i}`,
      startDate,
      endDate,
      color: `hsl(${(i * 3.6) % 360}, 70%, 55%)`, // градиент цветов
    };

    // Добавляем зависимость от предыдущей задачи (кроме первой)
    if (i > 1) {
      task.dependencies = [{ taskId: `chain-${i - 1}`, type: 'FS' as const, lag }];
    }

    tasks.push(task);

    // Вычисляем дату начала следующей задачи
    // Следующая задача начинается после: end текущей + лаг
    currentDate = addDays(addDays(currentDate, taskDuration - 1), lag + 1);
  }

  return tasks;
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(createSampleTasks);
  const [dependencyTasks, setDependencyTasks] = useState<Task[]>(createDependencyTasks);
  const [cascadeTasks, setCascadeTasks] = useState<Task[]>(createCascadeTasks);
  const [chain100Tasks, setChain100Tasks] = useState<Task[]>(createChain100Tasks);
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

  const handleChain100Change = useCallback(
    (updated: Task[] | ((t: Task[]) => Task[])) =>
      setChain100Tasks(typeof updated === "function" ? updated : () => updated),
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

      {/* Chain 100 Demo - 100 задач с FS+2 */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>
          Цепочка из 100 задач (FS +2 дня)
        </h2>
        <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
          Генератор для тестирования: 100 задач, каждая связана с предыдущей зависимостью FS с лагом +2 дня.
          Перетащи первую задачу — cascade сдвинет всю цепочку.
        </p>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          <GanttChart
            tasks={chain100Tasks}
            onChange={handleChain100Change}
            onCascade={(shifted) => console.log(`Cascade: ${shifted.length} tasks shifted`)}
            dayWidth={24}
            rowHeight={36}
            containerHeight={600}
          />
        </div>
      </div>
    </main>
  );
}

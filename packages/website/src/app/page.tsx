"use client";

import { useState, useCallback, useRef } from "react";
import { GanttChart, type Task, type GanttChartHandle } from "gantt-lib";

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
    {
      "id": "1",
      "name": "Геодезическая разбивка площадки",
      "startDate": "2026-02-12T00:00:00.000Z",
      "endDate": "2026-02-20T00:00:00.000Z",
      "progress": 100,
      "accepted": true,
      "locked": true,
      "dependencies": []
    },
    {
      "id": "2",
      "name": "Ограждение и временные дороги",
      "startDate": "2026-02-14T00:00:00.000Z",
      "endDate": "2026-02-21T00:00:00.000Z",
      "progress": 100,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "1",
          "type": "SS",
          "lag": 2
        }
      ]
    },
    {
      "id": "3",
      "name": "Подключение временных коммуникаций",
      "startDate": "2026-02-04T00:00:00.000Z",
      "endDate": "2026-02-13T00:00:00.000Z",
      "progress": 90,
      "accepted": false,
      "color": "#f43",
      "dependencies": [
        {
          "taskId": "2",
          "type": "SF",
          "lag": 0
        }
      ]
    },
    {
      "id": "4",
      "name": "Разработка котлована",
      "startDate": "2026-02-19T00:00:00.000Z",
      "endDate": "2026-02-24T00:00:00.000Z",
      "progress": 100,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "2",
          "type": "FS",
          "lag": -2
        }
      ]
    },
    {
      "id": "5",
      "name": "Песчаная подушка",
      "startDate": "2026-02-23T00:00:00.000Z",
      "endDate": "2026-03-02T00:00:00.000Z",
      "progress": 95,
      "accepted": false,
      "color": "#4f3",
      "dependencies": [
        {
          "taskId": "4",
          "type": "FS",
          "lag": -1
        }
      ]
    },
    {
      "id": "6",
      "name": "Бетонная подготовка",
      "startDate": "2026-02-28T00:00:00.000Z",
      "endDate": "2026-03-07T00:00:00.000Z",
      "progress": 90,
      "accepted": false,
      "divider": "top",
      "dependencies": [
        {
          "taskId": "5",
          "type": "FS",
          "lag": -2
        }
      ]
    },
    {
      "id": "7",
      "name": "Армирование фундамента",
      "startDate": "2026-03-05T00:00:00.000Z",
      "endDate": "2026-03-13T00:00:00.000Z",
      "progress": 80,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "6",
          "type": "FS",
          "lag": -2
        }
      ]
    },
    {
      "id": "8",
      "name": "Бетонирование фундамента",
      "startDate": "2026-03-10T00:00:00.000Z",
      "endDate": "2026-03-15T00:00:00.000Z",
      "progress": 75,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "7",
          "type": "FF",
          "lag": 2
        }
      ]
    },
    {
      "id": "9",
      "name": "Уход за бетоном (7 дней)",
      "startDate": "2026-03-14T00:00:00.000Z",
      "endDate": "2026-03-21T00:00:00.000Z",
      "progress": 70,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "8",
          "type": "FS",
          "lag": -1
        }
      ]
    },
    {
      "id": "10",
      "name": "Гидроизоляция фундамента",
      "startDate": "2026-03-22T00:00:00.000Z",
      "endDate": "2026-03-30T00:00:00.000Z",
      "progress": 65,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "9",
          "type": "FS",
          "lag": 1
        }
      ]
    },
    {
      "id": "11",
      "name": "Возведение стен 1-2 этажа",
      "startDate": "2026-03-30T00:00:00.000Z",
      "endDate": "2026-04-29T00:00:00.000Z",
      "progress": 50,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "10",
          "type": "FS",
          "lag": 0
        }
      ]
    },
    {
      "id": "12",
      "name": "Монтаж плит перекрытия",
      "startDate": "2026-03-30T00:00:00.000Z",
      "endDate": "2026-04-14T00:00:00.000Z",
      "progress": 45,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "11",
          "type": "SS",
          "lag": 0
        }
      ]
    },
    {
      "id": "13",
      "name": "Устройство стропильной системы",
      "startDate": "2026-04-14T00:00:00.000Z",
      "endDate": "2026-04-29T00:00:00.000Z",
      "progress": 40,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "12",
          "type": "FS",
          "lag": 0
        }
      ]
    },
    {
      "id": "14",
      "name": "Монтаж кровельного покрытия",
      "startDate": "2026-04-29T00:00:00.000Z",
      "endDate": "2026-05-19T00:00:00.000Z",
      "progress": 30,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "13",
          "type": "FS",
          "lag": 0
        }
      ]
    },
    {
      "id": "15",
      "name": "Монтаж оконных блоков",
      "startDate": "2026-05-22T00:00:00.000Z",
      "endDate": "2026-06-08T00:00:00.000Z",
      "progress": 25,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "14",
          "type": "FS",
          "lag": 3
        }
      ]
    },
    {
      "id": "16",
      "name": "Устройство фасада",
      "startDate": "2026-05-22T00:00:00.000Z",
      "endDate": "2026-06-23T00:00:00.000Z",
      "progress": 20,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "15",
          "type": "SS",
          "lag": 0
        }
      ]
    },
    {
      "id": "17",
      "name": "Разводка инженерных сетей",
      "startDate": "2026-04-29T00:00:00.000Z",
      "endDate": "2026-05-29T00:00:00.000Z",
      "progress": 35,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "11",
          "type": "FS",
          "lag": 0
        }
      ]
    },
    {
      "id": "18",
      "name": "Штукатурка и стяжка",
      "startDate": "2026-05-29T00:00:00.000Z",
      "endDate": "2026-06-28T00:00:00.000Z",
      "progress": 15,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "17",
          "type": "FS",
          "lag": 0
        }
      ]
    },
    {
      "id": "19",
      "name": "Чистовая отделка",
      "startDate": "2026-06-25T00:00:00.000Z",
      "endDate": "2026-07-23T00:00:00.000Z",
      "progress": 5,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "18",
          "type": "FS",
          "lag": -3
        }
      ]
    },
    {
      "id": "20",
      "name": "Сдача объекта",
      "startDate": "2026-07-23T00:00:00.000Z",
      "endDate": "2026-07-28T00:00:00.000Z",
      "progress": 0,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "19",
          "type": "FS",
          "lag": 0
        }
      ]
    },
    {
      "id": "sf-1",
      "name": "Установка лифта (SF predecessor)",
      "startDate": "2026-07-01",
      "endDate": "2026-07-16",
      "progress": 0,
      "accepted": false,
      "dependencies": []
    },
    {
      "id": "sf-2",
      "name": "Поставка лифтового оборудования (SF successor)",
      "startDate": "2026-05-17",
      "endDate": "2026-07-01",
      "progress": 0,
      "accepted": false,
      "dependencies": [
        {
          "taskId": "sf-1",
          "type": "SF",
          "lag": 0
        }
      ]
    }
  ]
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

// Demo tasks for expired task coloring (Phase 15)
const createExpiredTasks = (): Task[] => {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];

  // Calculate dates relative to today
  const tenDaysAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 10));
  const fiveDaysAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 5));
  const threeDaysAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 3));
  const oneDayAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
  const tomorrow = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
  const nextWeek = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 7));

  return [
    // Time-based expiration examples
    {
      id: 'expired-1',
      name: '❌ 10-дневная задача: прошло 5 дней, прогресс 30% (ожидалось 50%)',
      startDate: formatDate(tenDaysAgo),
      endDate: formatDate(oneDayAgo),
      progress: 30,
      accepted: false,
    },
    {
      id: 'not-expired-time-1',
      name: '✓ 10-дневная задача: прошло 5 дней, прогресс 60% (опережает график)',
      startDate: formatDate(tenDaysAgo),
      endDate: formatDate(oneDayAgo),
      progress: 60,
      accepted: false,
    },
    {
      id: 'expired-2',
      name: '❌ 5-дневная задача: прошло 3 дня, прогресс 20% (ожидалось 60%)',
      startDate: formatDate(fiveDaysAgo),
      endDate: formatDate(tomorrow),
      progress: 20,
      accepted: false,
    },
    {
      id: 'not-expired-time-2',
      name: '✓ 5-дневная задача: прошло 3 дня, прогресс 70% (опережает график)',
      startDate: formatDate(fiveDaysAgo),
      endDate: formatDate(tomorrow),
      progress: 70,
      accepted: false,
    },
    {
      id: 'expired-3',
      name: '❌ Дата прошла, прогресс 100% но не принята',
      startDate: formatDate(threeDaysAgo),
      endDate: formatDate(oneDayAgo),
      progress: 100,
      accepted: false,
    },
    {
      id: 'not-expired-1',
      name: '✓ Не просрочена (дата в будущем)',
      startDate: formatDate(tomorrow),
      endDate: formatDate(nextWeek),
      progress: 30,
      accepted: false,
    },
    {
      id: 'not-expired-2',
      name: '✓ Выполнена и принята (не красная)',
      startDate: formatDate(threeDaysAgo),
      endDate: formatDate(oneDayAgo),
      progress: 100,
      accepted: true,
    },
    {
      id: 'not-expired-3',
      name: '✓ Завершенная задача в будущем',
      startDate: formatDate(tomorrow),
      endDate: formatDate(nextWeek),
      progress: 100,
      accepted: true,
    },
  ];
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(createSampleTasks);
  const [dependencyTasks, setDependencyTasks] = useState<Task[]>(createDependencyTasks);
  const [cascadeTasks, setCascadeTasks] = useState<Task[]>(createCascadeTasks);
  const [chain100Tasks, setChain100Tasks] = useState<Task[]>(createChain100Tasks);
  const [expiredTasks, setExpiredTasks] = useState<Task[]>(createExpiredTasks);
  const [blockConstraints, setBlockConstraints] = useState(true);
  const [showTaskList, setShowTaskList] = useState(true);
  const [disableTaskNameEditing, setDisableTaskNameEditing] = useState(false);
  const [highlightExpired, setHighlightExpired] = useState(true);

  // Ref for the main GanttChart to access scrollToToday method
  const ganttChartRef = useRef<GanttChartHandle>(null);

  const handleChange = useCallback(
    (updated: Task[] | ((t: Task[]) => Task[])) =>
      setTasks(typeof updated === "function" ? updated : () => updated),
    [],
  );

  const exportTasksAsJson = useCallback((taskList: Task[]) => {
    const result = taskList.map((task) => ({
      id: task.id,
      name: task.name,
      startDate: task.startDate,
      endDate: task.endDate,
      progress: task.progress ?? 0,
      accepted: task.accepted ?? false,
      dependencies: (task.dependencies ?? []).map((dep) => ({
        taskId: dep.taskId,
        type: dep.type,
        lag: dep.lag ?? 0,
      })),
    }));
    const json = JSON.stringify(result, null, 2);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(() => {
        alert("JSON copied to clipboard!");
      });
    } else {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tasks.json";
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

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

  const handleExpiredTasksChange = useCallback(
    (updated: Task[] | ((t: Task[]) => Task[])) => {
      setExpiredTasks(typeof updated === "function" ? updated : () => updated);
    },
    [],
  );

  return (
    <main>
      <div className="demo-page">
        <header className="demo-hero">
          <h1>gantt-lib</h1>
          <p>Drag task bars to move or resize. Dependency links, cascade shifting, and expired task highlighting included.</p>
          <code>npm install gantt-lib</code>
        </header>

        {/* Main Demo */}
        <section className="demo-section">
          <h2 className="demo-section-title">Construction Project</h2>
          <div className="demo-controls">
            <button
              className={`demo-btn ${showTaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
              onClick={() => setShowTaskList(!showTaskList)}
            >
              {showTaskList ? "Hide Task List" : "Show Task List"}
            </button>
            <button
              className="demo-btn demo-btn-purple"
              onClick={() => ganttChartRef.current?.scrollToToday()}
            >
              Today
            </button>
            <button
              className={`demo-btn ${disableTaskNameEditing ? "demo-btn-muted" : "demo-btn-active"}`}
              onClick={() => setDisableTaskNameEditing(!disableTaskNameEditing)}
            >
              {disableTaskNameEditing ? "Enable Name Editing" : "Disable Name Editing"}
            </button>
            <button
              className={`demo-btn ${highlightExpired ? "demo-btn-danger" : "demo-btn-muted"}`}
              onClick={() => setHighlightExpired(!highlightExpired)}
            >
              {highlightExpired ? "Disable Expired Highlight" : "Enable Expired Highlight"}
            </button>
          </div>
          <div className="demo-chart-card">
            <GanttChart
              ref={ganttChartRef}
              tasks={tasks}
              dayWidth={24}
              rowHeight={36}
              onChange={handleChange}
              containerHeight={"80dvh"}
              showTaskList={showTaskList}
              taskListWidth={500}
              disableTaskNameEditing={disableTaskNameEditing}
              highlightExpiredTasks={highlightExpired}
            />
          </div>
        </section>

        {/* Dependencies Demo */}
        <section className="demo-section">
          <h2 className="demo-section-title">Task Dependencies</h2>
          <p className="demo-section-desc">
            Tasks can have dependencies with 4 link types (FS, SS, FF, SF) and optional lag.
            Circular dependencies are highlighted in red.
          </p>
          <div className="demo-controls">
            <label className="demo-checkbox-label">
              <input
                type="checkbox"
                checked={blockConstraints}
                onChange={(e) => setBlockConstraints(e.target.checked)}
              />
              Block constraints during drag
            </label>
            <span className="demo-hint">(uncheck to drag freely past dependency boundaries)</span>
          </div>
          <div className="demo-chart-card">
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
        </section>

        {/* Cascade Demo (Phase 7) */}
        <section className="demo-section">
          <h2 className="demo-section-title">Каскадное смещение (Phase 7)</h2>
          <p className="demo-section-desc">
            Жесткий режим: перетащи «Задача A» — B и C двигаются вместе в реальном времени.
            D — независимая, не смещается. После отпускания проверь консоль.
          </p>
          <div className="demo-chart-card">
            <GanttChart
              tasks={cascadeTasks}
              onChange={handleCascadeChange}
              onCascade={(shifted) => console.log('Cascade:', shifted.map(t => `${t.name}: ${t.startDate}`))}
              dayWidth={40}
              rowHeight={40}
              containerHeight={250}
            />
          </div>
        </section>

        {/* Chain 100 Demo - 100 задач с FS+2 */}
        <section className="demo-section">
          <h2 className="demo-section-title">Цепочка из 100 задач (FS +2 дня)</h2>
          <p className="demo-section-desc">
            Генератор для тестирования: 100 задач, каждая связана с предыдущей зависимостью FS с лагом +2 дня.
            Перетащи первую задачу — cascade сдвинет всю цепочку.
          </p>
          <div className="demo-chart-card">
            <GanttChart
              tasks={chain100Tasks}
              onChange={handleChain100Change}
              onCascade={(shifted) => console.log(`Cascade: ${shifted.length} tasks shifted`)}
              dayWidth={24}
              rowHeight={36}
              containerHeight={600}
            />
          </div>
        </section>

        {/* Expired Tasks Demo (Phase 15) */}
        <section className="demo-section">
          <h2 className="demo-section-title">Подсветка просроченных задач (Phase 15)</h2>
          <p className="demo-section-desc">
            <strong>Логика просрочки по времени:</strong> ожидаемый прогресс = (прошедшие дни / длительность) × 100.<br/>
            Задача красная, если: endDate &lt; today AND (progress &lt; expectedProgress OR not accepted).<br/>
            Выполненные и принятые задачи (progress = 100 AND accepted = true) не красные.
          </p>
          <div className="demo-chart-card">
            <GanttChart
              tasks={expiredTasks}
              onChange={handleExpiredTasksChange}
              dayWidth={40}
              rowHeight={40}
              containerHeight={250}
              highlightExpiredTasks={highlightExpired}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

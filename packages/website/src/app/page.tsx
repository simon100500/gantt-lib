"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { GanttChart, Calendar, type Task, type GanttChartHandle, type TaskListColumn, alignToWorkingDay, buildTaskRangeFromStart, createCustomDayPredicate, getTaskDuration, universalCascade, and, or, not, withoutDeps, expired, inDateRange, progressInRange, nameContains, type TaskPredicate } from "gantt-lib";
import { isTaskParent, getAllDescendants } from "gantt-lib";

const MAIN_CHART_CUSTOM_DAYS = [
  { date: new Date(Date.UTC(2026, 2, 9)), type: 'weekend' as const },  // March 09, 2026
  { date: new Date(Date.UTC(2026, 4, 1)), type: 'weekend' as const },  // May 1, 2026
  { date: new Date(Date.UTC(2026, 4, 11)), type: 'weekend' as const }, // May 11, 2026
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' as const }, // March 14, 2026
];

const MAIN_CHART_WEEKEND_PREDICATE = createCustomDayPredicate({ customDays: MAIN_CHART_CUSTOM_DAYS });

const reflowTasksForBusinessDays = (sourceTasks: Task[], weekendPredicate: (date: Date) => boolean): Task[] => {
  let tasks: Task[] = sourceTasks.map((task) => ({
    ...task,
    dependencies: task.dependencies?.map((dep) => ({ ...dep, lag: dep.lag ?? 0 })),
  }));

  const rootSeeds = tasks.filter((task) => !task.parentId && (!task.dependencies || task.dependencies.length === 0));

  for (const seed of rootSeeds) {
    const currentSeed = tasks.find((task) => task.id === seed.id);
    if (!currentSeed) continue;

    const alignedStart = alignToWorkingDay(new Date(`${currentSeed.startDate}T00:00:00.000Z`), 1, weekendPredicate);
    const duration = getTaskDuration(currentSeed.startDate, currentSeed.endDate, true, weekendPredicate);
    const range = buildTaskRangeFromStart(alignedStart, duration, true, weekendPredicate, 1);
    const movedSeed: Task = {
      ...currentSeed,
      startDate: range.start.toISOString().split('T')[0],
      endDate: range.end.toISOString().split('T')[0],
    };

    const cascaded = universalCascade(movedSeed, range.start, range.end, tasks, true, weekendPredicate);
    const updates = new Map<string, Task>([
      [movedSeed.id, movedSeed] as [string, Task],
      ...cascaded.map((task): [string, Task] => [task.id, task]),
    ]);

    tasks = tasks.map((task) => updates.get(task.id) ?? task);
  }

  return tasks;
};

const createSampleTasks = (): Task[] => {
  return [
    // GROUP 1 — Подготовительные работы
    {
      id: 'g1',
      name: 'Подготовительные работы',
      startDate: '2026-02-01',
      endDate: '2026-02-15',
      progress: 100,
      accepted: true,
      locked: true,
      dependencies: [],
    },
    {
      id: 'g1-1',
      name: 'Геодезическая разбивка',
      startDate: '2026-02-01',
      endDate: '2026-02-03',
      progress: 100,
      accepted: true,
      parentId: 'g1',
      dependencies: [],
    },
    {
      id: 'g1-2',
      name: 'Ограждение площадки',
      startDate: '2026-02-03',
      endDate: '2026-02-07',
      progress: 100,
      accepted: true,
      parentId: 'g1',
      dependencies: [{ taskId: 'g1-1', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g1-3',
      name: 'Временные дороги',
      startDate: '2026-02-05',
      endDate: '2026-02-10',
      progress: 100,
      accepted: true,
      parentId: 'g1',
      dependencies: [{ taskId: 'g1-1', type: 'SS' as const, lag: 2 }],
    },
    {
      id: 'g1-4',
      name: 'Подключение временных коммуникаций',
      startDate: '2026-02-08',
      endDate: '2026-02-12',
      progress: 100,
      accepted: false,
      parentId: 'g1',
      dependencies: [{ taskId: 'g1-2', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g1-5',
      name: 'Установка строительного городка',
      startDate: '2026-02-10',
      endDate: '2026-02-15',
      progress: 100,
      accepted: true,
      parentId: 'g1',
      dependencies: [{ taskId: 'g1-3', type: 'FS' as const, lag: 0 }],
    },

    // GROUP 2 — Земляные работы
    {
      id: 'g2',
      name: 'Земляные работы',
      startDate: '2026-02-16',
      endDate: '2026-03-01',
      progress: 100,
      accepted: true,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g2-1',
      name: 'Разработка котлована',
      startDate: '2026-02-16',
      endDate: '2026-02-22',
      progress: 100,
      accepted: true,
      parentId: 'g2',
      dependencies: [{ taskId: 'g1', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g2-2',
      name: 'Вывоз грунта',
      startDate: '2026-02-17',
      endDate: '2026-02-23',
      progress: 100,
      accepted: true,
      parentId: 'g2',
      dependencies: [{ taskId: 'g2-1', type: 'SS' as const, lag: 1 }],
    },
    {
      id: 'g2-3',
      name: 'Зачистка дна котлована',
      startDate: '2026-02-23',
      endDate: '2026-02-25',
      progress: 100,
      accepted: true,
      parentId: 'g2',
      dependencies: [{ taskId: 'g2-1', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g2-4',
      name: 'Песчаная подушка',
      startDate: '2026-02-25',
      endDate: '2026-02-27',
      progress: 100,
      accepted: true,
      color: '#4ade80',
      parentId: 'g2',
      dependencies: [{ taskId: 'g2-3', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g2-5',
      name: 'Уплотнение основания',
      startDate: '2026-02-27',
      endDate: '2026-03-01',
      progress: 100,
      accepted: true,
      parentId: 'g2',
      dependencies: [{ taskId: 'g2-4', type: 'FS' as const, lag: 0 }],
    },

    // GROUP 3 — Фундамент
    {
      id: 'g3',
      name: 'Фундамент',
      startDate: '2026-03-02',
      endDate: '2026-03-28',
      progress: 85,
      accepted: false,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g3-1',
      name: 'Опалубка фундамента',
      startDate: '2026-03-02',
      endDate: '2026-03-06',
      progress: 100,
      accepted: true,
      parentId: 'g3',
      dependencies: [{ taskId: 'g2', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g3-2',
      name: 'Армирование подошвы',
      startDate: '2026-03-04',
      endDate: '2026-03-09',
      progress: 100,
      accepted: true,
      parentId: 'g3',
      dependencies: [{ taskId: 'g3-1', type: 'SS' as const, lag: 2 }],
    },
    {
      id: 'g3-3',
      name: 'Бетонная подготовка',
      startDate: '2026-03-07',
      endDate: '2026-03-10',
      progress: 100,
      accepted: true,
      color: '#60a5fa',
      parentId: 'g3',
      dependencies: [{ taskId: 'g3-1', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g3-4',
      name: 'Бетонирование фундамента',
      startDate: '2026-03-10',
      endDate: '2026-03-16',
      progress: 100,
      accepted: false,
      parentId: 'g3',
      dependencies: [{ taskId: 'g3-2', type: 'FF' as const, lag: 0 }],
    },
    {
      id: 'g3-5',
      name: 'Уход за бетоном',
      startDate: '2026-03-15',
      endDate: '2026-03-22',
      progress: 80,
      accepted: false,
      parentId: 'g3',
      dependencies: [{ taskId: 'g3-4', type: 'FS' as const, lag: -1 }],
    },
    {
      id: 'g3-6',
      name: 'Гидроизоляция',
      startDate: '2026-03-22',
      endDate: '2026-03-26',
      progress: 60,
      accepted: false,
      color: '#f59e0b',
      parentId: 'g3',
      dependencies: [{ taskId: 'g3-5', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g3-7',
      name: 'Обратная засыпка',
      startDate: '2026-03-26',
      endDate: '2026-03-28',
      progress: 40,
      accepted: false,
      parentId: 'g3',
      dependencies: [{ taskId: 'g3-6', type: 'FS' as const, lag: 0 }],
    },

    // GROUP 4 — Каркас здания
    {
      id: 'g4',
      name: 'Каркас здания',
      startDate: '2026-03-29',
      endDate: '2026-05-10',
      progress: 45,
      accepted: false,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g4-1',
      name: 'Монтаж колонн 1 этажа',
      startDate: '2026-03-29',
      endDate: '2026-04-05',
      progress: 80,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g3', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g4-2',
      name: 'Монтаж балок перекрытия',
      startDate: '2026-04-03',
      endDate: '2026-04-12',
      progress: 70,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-1', type: 'SS' as const, lag: 5 }],
    },
    {
      id: 'g4-3',
      name: 'Монтаж плит перекрытия',
      startDate: '2026-04-10',
      endDate: '2026-04-18',
      progress: 55,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-2', type: 'FF' as const, lag: -2 }],
    },
    {
      id: 'g4-4',
      name: 'Монтаж колонн 2 этажа',
      startDate: '2026-04-15',
      endDate: '2026-04-24',
      progress: 35,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-3', type: 'SS' as const, lag: 5 }],
    },
    {
      id: 'g4-5',
      name: 'Перекрытие 2 этажа',
      startDate: '2026-04-22',
      endDate: '2026-05-01',
      progress: 20,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-4', type: 'SS' as const, lag: 5 }],
    },
    {
      id: 'g4-6',
      name: 'Монтаж стропил',
      startDate: '2026-05-01',
      endDate: '2026-05-10',
      progress: 10,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-5', type: 'FS' as const, lag: 0 }],
    },

    // GROUP 5 — Кровля
    {
      id: 'g5',
      name: 'Кровля',
      startDate: '2026-05-10',
      endDate: '2026-05-30',
      progress: 5,
      accepted: false,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g5-1',
      name: 'Монтаж обрешётки',
      startDate: '2026-05-10',
      endDate: '2026-05-15',
      progress: 15,
      accepted: false,
      parentId: 'g5',
      dependencies: [{ taskId: 'g4', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g5-2',
      name: 'Укладка утеплителя',
      startDate: '2026-05-13',
      endDate: '2026-05-20',
      progress: 5,
      accepted: false,
      parentId: 'g5',
      dependencies: [{ taskId: 'g5-1', type: 'SS' as const, lag: 3 }],
    },
    {
      id: 'g5-3',
      name: 'Монтаж кровельного покрытия',
      startDate: '2026-05-18',
      endDate: '2026-05-27',
      progress: 0,
      accepted: false,
      parentId: 'g5',
      dependencies: [{ taskId: 'g5-1', type: 'FS' as const, lag: 3 }],
    },
    {
      id: 'g5-4',
      name: 'Водосточная система',
      startDate: '2026-05-25',
      endDate: '2026-05-30',
      progress: 0,
      accepted: false,
      parentId: 'g5',
      dependencies: [{ taskId: 'g5-3', type: 'FF' as const, lag: 3 }],
    },

    // GROUP 6 — Наружные стены и фасад
    {
      id: 'g6',
      name: 'Наружные стены и фасад',
      startDate: '2026-05-01',
      endDate: '2026-06-20',
      progress: 10,
      accepted: false,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g6-1',
      name: 'Кладка наружных стен 1 эт.',
      startDate: '2026-05-01',
      endDate: '2026-05-18',
      progress: 20,
      accepted: false,
      parentId: 'g6',
      dependencies: [{ taskId: 'g4-3', type: 'FS' as const, lag: 13 }],
    },
    {
      id: 'g6-2',
      name: 'Кладка наружных стен 2 эт.',
      startDate: '2026-05-15',
      endDate: '2026-06-01',
      progress: 5,
      accepted: false,
      parentId: 'g6',
      dependencies: [{ taskId: 'g6-1', type: 'SS' as const, lag: 14 }],
    },
    {
      id: 'g6-3',
      name: 'Монтаж оконных блоков',
      startDate: '2026-06-01',
      endDate: '2026-06-10',
      progress: 0,
      accepted: false,
      parentId: 'g6',
      dependencies: [{ taskId: 'g6-2', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g6-4',
      name: 'Утепление фасада',
      startDate: '2026-06-05',
      endDate: '2026-06-15',
      progress: 0,
      accepted: false,
      parentId: 'g6',
      dependencies: [{ taskId: 'g6-3', type: 'SS' as const, lag: 4 }],
    },
    {
      id: 'g6-5',
      name: 'Финишная отделка фасада',
      startDate: '2026-06-12',
      endDate: '2026-06-20',
      progress: 0,
      accepted: false,
      color: '#a78bfa',
      parentId: 'g6',
      dependencies: [{ taskId: 'g6-4', type: 'FF' as const, lag: 5 }],
    },

    // GROUP 7 — Инженерные сети
    {
      id: 'g7',
      name: 'Инженерные сети',
      startDate: '2026-05-15',
      endDate: '2026-07-01',
      progress: 5,
      accepted: false,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g7-1',
      name: 'Разводка электросетей',
      startDate: '2026-05-15',
      endDate: '2026-06-01',
      progress: 10,
      accepted: false,
      parentId: 'g7',
      dependencies: [{ taskId: 'g4-3', type: 'FS' as const, lag: 27 }],
    },
    {
      id: 'g7-2',
      name: 'Сантехнические работы',
      startDate: '2026-05-20',
      endDate: '2026-06-10',
      progress: 5,
      accepted: false,
      parentId: 'g7',
      dependencies: [{ taskId: 'g7-1', type: 'SS' as const, lag: 5 }],
    },
    {
      id: 'g7-3',
      name: 'Вентиляция и кондиционирование',
      startDate: '2026-06-01',
      endDate: '2026-06-20',
      progress: 0,
      accepted: false,
      parentId: 'g7',
      dependencies: [{ taskId: 'g7-1', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g7-4',
      name: 'Слаботочные системы (охрана/связь)',
      startDate: '2026-06-10',
      endDate: '2026-06-25',
      progress: 0,
      accepted: false,
      color: '#38bdf8',
      parentId: 'g7',
      dependencies: [{ taskId: 'g7-3', type: 'SS' as const, lag: 9 }],
    },
    {
      id: 'g7-5',
      name: 'Испытание и сдача сетей',
      startDate: '2026-06-25',
      endDate: '2026-07-01',
      progress: 0,
      accepted: false,
      parentId: 'g7',
      dependencies: [
        { taskId: 'g7-2', type: 'FS' as const, lag: 15 },
        { taskId: 'g7-4', type: 'SF' as const, lag: 0 },
      ],
    },

    // GROUP 8 — Внутренняя отделка и сдача
    {
      id: 'g8',
      name: 'Внутренняя отделка и сдача',
      startDate: '2026-07-01',
      endDate: '2026-08-15',
      progress: 0,
      accepted: false,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g8-1',
      name: 'Штукатурка стен',
      startDate: '2026-07-01',
      endDate: '2026-07-18',
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g7', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g8-2',
      name: 'Стяжка пола',
      startDate: '2026-07-05',
      endDate: '2026-07-20',
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-1', type: 'SS' as const, lag: 4 }],
    },
    {
      id: 'g8-3',
      name: 'Чистовая отделка',
      startDate: '2026-07-20',
      endDate: '2026-08-05',
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-1', type: 'FS' as const, lag: 2 }],
    },
    {
      id: 'g8-4',
      name: 'Установка дверей и фурнитуры',
      startDate: '2026-07-28',
      endDate: '2026-08-08',
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-3', type: 'SS' as const, lag: 8 }],
    },
    {
      id: 'g8-5',
      name: 'Сдача объекта',
      startDate: '2026-08-10',
      endDate: '2026-08-15',
      progress: 0,
      accepted: false,
      locked: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-3', type: 'FF' as const, lag: 10 }],
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
      dependencies: [{ taskId: 'task-2', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'task-2',
      name: 'Task 2',
      startDate: '2026-02-04',
      endDate: '2026-02-06',
      color: '#10b981',
      dependencies: [{ taskId: 'task-1', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'task-4',
      name: 'Task 4',
      startDate: '2026-02-10',
      endDate: '2026-02-12',
      color: '#ef4444',
      dependencies: [{ taskId: 'task-3', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'task-5',
      name: 'Task 5',
      startDate: '2026-02-13',
      endDate: '2026-02-15',
      color: '#8b5cf6',
      dependencies: [{ taskId: 'task-4', type: 'FS' as const, lag: 0 }],
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
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [blockConstraints, setBlockConstraints] = useState(true);
  const [showTaskList, setShowTaskList] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showDependencyTaskList, setShowDependencyTaskList] = useState(false);
  const [showCascadeTaskList, setShowCascadeTaskList] = useState(false);
  const [showChain100TaskList, setShowChain100TaskList] = useState(false);
  const [showExpiredTaskList, setShowExpiredTaskList] = useState(false);

  const [disableTaskNameEditing, setDisableTaskNameEditing] = useState(false);
  const [highlightExpired, setHighlightExpired] = useState(true);
  const [businessDays, setBusinessDays] = useState(true);
  const [disableTaskDrag, setDisableTaskDrag] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskPredicate | undefined>(undefined);
  const [taskFilterId, setTaskFilterId] = useState<string | undefined>(undefined);
  const [filterMode, setFilterMode] = useState<'highlight' | 'hide'>('highlight');
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(0);
  useEffect(() => {
    if (!businessDays) return;
    setTasks((prev) => reflowTasksForBusinessDays(prev, MAIN_CHART_WEEKEND_PREDICATE));
  }, [businessDays]);

  // Ref for the main GanttChart to access scrollToToday method
  const ganttChartRef = useRef<GanttChartHandle>(null);

  const searchResultIds = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return tasks
      .filter((task) =>
        task.name
          .toLowerCase()
          .split(/\s+/)
          .some((word) => word.startsWith(normalizedQuery))
      )
      .map((task) => task.id);
  }, [searchQuery, tasks]);

  const highlightedSearchTaskIds = useMemo(
    () => new Set(searchResultIds),
    [searchResultIds]
  );

  const activeSearchTaskId = searchResultIds[activeSearchResultIndex] ?? searchResultIds[0];

  useEffect(() => {
    setActiveSearchResultIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (searchResultIds.length === 0) {
      if (activeSearchResultIndex !== 0) {
        setActiveSearchResultIndex(0);
      }
      return;
    }

    if (activeSearchResultIndex > searchResultIds.length - 1) {
      setActiveSearchResultIndex(searchResultIds.length - 1);
    }
  }, [activeSearchResultIndex, searchResultIds]);

  useEffect(() => {
    if (!activeSearchTaskId) return;
    ganttChartRef.current?.scrollToRow(activeSearchTaskId);
  }, [activeSearchTaskId]);

  const handleChange = useCallback(
    (updatedTasks: Task[]) => {
      setTasks(prev => {
        const updatedMap = new Map(updatedTasks.map(t => [t.id, t]));
        return prev.map(t => updatedMap.get(t.id) ?? t);
      });
    },
    [],
  );

  const handleAdd = useCallback((task: Task) => {
    setTasks(prev => [...prev, task]);
  }, []);

  const handleDelete = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const handleInsertAfter = useCallback((taskId: string, newTask: Task) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;

      // Case 1: Task is a parent → insert after all descendants
      if (isTaskParent(taskId, prev)) {
        const descendants = getAllDescendants(taskId, prev);
        const lastIndex = descendants.length > 0
          ? prev.findIndex(t => t.id === descendants[descendants.length - 1].id)
          : prev.findIndex(t => t.id === taskId);
        if (lastIndex === -1) return prev;
        const newTasks = [...prev];
        newTasks.splice(lastIndex + 1, 0, { ...newTask, parentId: undefined });
        return newTasks;
      }

      // Case 2: Task is a child → insert with same parentId after current task
      const index = prev.findIndex(t => t.id === taskId);
      if (index === -1) return prev;
      const newTasks = [...prev];
      newTasks.splice(index + 1, 0, { ...newTask, parentId: task.parentId });
      return newTasks;
    });
  }, []);

  const handleReorder = useCallback((reorderedTasks: Task[], movedTaskId?: string, inferredParentId?: string) => {
    // Use the full reorderedTasks array as-is (already normalized by GanttChart.handleReorder)
    // The reorderedTasks array has the correct order and parentId updates applied
    setTasks(reorderedTasks);
  }, []);

  const handleSearchResultStep = useCallback((direction: -1 | 1) => {
    if (searchResultIds.length === 0) {
      return;
    }

    setActiveSearchResultIndex((prev) => {
      const nextIndex = prev + direction;
      if (nextIndex < 0) {
        return searchResultIds.length - 1;
      }
      if (nextIndex >= searchResultIds.length) {
        return 0;
      }
      return nextIndex;
    });
  }, [searchResultIds]);

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
    (updatedTasks: Task[]) => {
      setDependencyTasks(prev => {
        const updatedMap = new Map(updatedTasks.map(t => [t.id, t]));
        return prev.map(t => updatedMap.get(t.id) ?? t);
      });
    },
    [],
  );

  const handleDependencyAdd = useCallback((task: Task) => {
    setDependencyTasks(prev => [...prev, task]);
  }, []);

  const handleCascadeChange = useCallback(
    (updatedTasks: Task[]) => {
      setCascadeTasks(prev => {
        const updatedMap = new Map(updatedTasks.map(t => [t.id, t]));
        return prev.map(t => updatedMap.get(t.id) ?? t);
      });
    },
    [],
  );

  const handleCascadeAdd = useCallback((task: Task) => {
    setCascadeTasks(prev => [...prev, task]);
  }, []);

  const handleChain100Change = useCallback(
    (updatedTasks: Task[]) => {
      setChain100Tasks(prev => {
        const updatedMap = new Map(updatedTasks.map(t => [t.id, t]));
        return prev.map(t => updatedMap.get(t.id) ?? t);
      });
    },
    [],
  );

  const handleChain100Add = useCallback((task: Task) => {
    setChain100Tasks(prev => [...prev, task]);
  }, []);

  const handleExpiredTasksChange = useCallback(
    (updatedTasks: Task[]) => {
      setExpiredTasks(prev => {
        const updatedMap = new Map(updatedTasks.map(t => [t.id, t]));
        return prev.map(t => updatedMap.get(t.id) ?? t);
      });
    },
    [],
  );

  const handleExpiredTasksAdd = useCallback((task: Task) => {
    setExpiredTasks(prev => [...prev, task]);
  }, []);

  // Demo tasks for hierarchy (Phase 19)
  const createHierarchyTasks = (): Task[] => {
    const baseDate = new Date('2026-03-01');
    const formatDate = (date: Date): string => date.toISOString().split('T')[0];
    const addDays = (date: Date, days: number): Date => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    return [
      // Root task 1 with children
      {
        id: 'hierarchy-1',
        name: 'Фундаментные работы (родитель)',
        startDate: formatDate(baseDate),
        endDate: formatDate(addDays(addDays(baseDate, 4), 7)), // Mar 1 - Mar 11 (11 days)
        progress: 70,
        accepted: false,
      },
      {
        id: 'hierarchy-1-1',
        name: 'Котлован (ребенок)',
        parentId: 'hierarchy-1',
        startDate: formatDate(baseDate),
        endDate: formatDate(addDays(baseDate, 4)), // Mar 1 - Mar 5
        progress: 100,
        accepted: true,
      },
      {
        id: 'hierarchy-1-2',
        name: 'Бетонная подготовка (ребенок)',
        parentId: 'hierarchy-1',
        startDate: formatDate(addDays(baseDate, 5)),
        endDate: formatDate(addDays(addDays(baseDate, 5), 5)), // Mar 6 - Mar 11
        dependencies: [{ taskId: 'hierarchy-1-1', type: 'FS' as const, lag: 0 }],
        progress: 60,
        accepted: false,
      },

      // Root task 2 with children
      {
        id: 'hierarchy-2',
        name: 'Строительство стен (родитель)',
        startDate: formatDate(addDays(baseDate, 12)),
        endDate: formatDate(addDays(addDays(baseDate, 12), 14)), // Mar 13 - Mar 27
        progress: 40,
        accepted: false,
      },
      {
        id: 'hierarchy-2-1',
        name: 'Кладка 1 этажа (ребенок)',
        parentId: 'hierarchy-2',
        startDate: formatDate(addDays(baseDate, 12)),
        endDate: formatDate(addDays(addDays(baseDate, 12), 6)), // Mar 13 - Mar 19
        progress: 80,
        accepted: false,
      },
      {
        id: 'hierarchy-2-2',
        name: 'Кладка 2 этажа (ребенок)',
        parentId: 'hierarchy-2',
        startDate: formatDate(addDays(baseDate, 20)),
        endDate: formatDate(addDays(addDays(baseDate, 20), 6)), // Mar 21 - Mar 27
        progress: 20,
        accepted: false,
      },

      // Standalone root task (can be demoted)
      {
        id: 'hierarchy-3',
        name: 'Кровельные работы (отдельная задача)',
        startDate: formatDate(addDays(baseDate, 28)),
        endDate: formatDate(addDays(addDays(baseDate, 28), 5)), // Mar 29 - Apr 3
        progress: 0,
        accepted: false,
      },
    ];
  };

  const [hierarchyTasks, setHierarchyTasks] = useState<Task[]>(createHierarchyTasks);
  const [showHierarchyTaskList, setShowHierarchyTaskList] = useState(true);

  // Custom Weekend Examples (Phase 21)
  const [showCustomWeekendTaskList, setShowCustomWeekendTaskList] = useState(true);
  const [showWorkdaysTaskList, setShowWorkdaysTaskList] = useState(true);
  const [showPrecedenceTaskList, setShowPrecedenceTaskList] = useState(true);
  const [showPredicateTaskList, setShowPredicateTaskList] = useState(true);
  const [showMultiMonthTaskList, setShowMultiMonthTaskList] = useState(true);

  const handleHierarchyChange = useCallback(
    (updatedTasks: Task[]) => {
      setHierarchyTasks(prev => {
        const updatedMap = new Map(updatedTasks.map(t => [t.id, t]));
        return prev.map(t => updatedMap.get(t.id) ?? t);
      });
    },
    [],
  );

  const handleHierarchyAdd = useCallback((task: Task) => {
    setHierarchyTasks(prev => [...prev, task]);
  }, []);

  const handleHierarchyReorder = useCallback((reorderedTasks: Task[], movedTaskId?: string, inferredParentId?: string) => {
    // Use the full reorderedTasks array as-is (already normalized by GanttChart.handleReorder)
    // The reorderedTasks array has the correct order and parentId updates applied
    setHierarchyTasks(reorderedTasks);
  }, []);

  // Custom Weekend Examples handlers (Phase 21)
  const customWeekendTasks: Task[] = [
    { id: '1', name: 'Task 1', startDate: '2026-03-05', endDate: '2026-03-12' },
    { id: '2', name: 'Task 2', startDate: '2026-03-11', endDate: '2026-03-18' },
  ];

  const workdaysTasks: Task[] = [
    { id: '1', name: 'Task 1', startDate: '2026-03-10', endDate: '2026-03-20' },
    { id: '2', name: 'Task 2', startDate: '2026-03-14', endDate: '2026-03-22' },
  ];

  const precedenceTasks: Task[] = [
    { id: '1', name: 'Task 1', startDate: '2026-03-17', endDate: '2026-03-28' },
  ];

  const predicateTasks: Task[] = [
    { id: '1', name: 'Task 1', startDate: '2026-03-03', endDate: '2026-03-16' },
  ];

  const multiMonthTasks: Task[] = [
    { id: '1', name: 'Task 1', startDate: '2026-03-01', endDate: '2026-04-15' },
    { id: '2', name: 'Task 2', startDate: '2026-03-20', endDate: '2026-04-25' },
  ];

  // Additional columns demo
  const [additionalColumnsTasks, setAdditionalColumnsTasks] = useState<(Task & { assignee?: string; priority?: 'low' | 'medium' | 'high' })[]>([
    { id: 'ac-1', name: 'Design API', startDate: '2026-03-27', endDate: '2026-04-03', assignee: 'Alice', priority: 'high' },
    { id: 'ac-2', name: 'Backend impl', startDate: '2026-04-01', endDate: '2026-04-15', assignee: 'Bob', priority: 'high' },
    { id: 'ac-3', name: 'Frontend impl', startDate: '2026-04-10', endDate: '2026-04-20', assignee: 'Charlie', priority: 'medium' },
    { id: 'ac-4', name: 'Write tests', startDate: '2026-04-18', endDate: '2026-04-25', assignee: 'Alice', priority: 'low' },
    { id: 'ac-5', name: 'Deploy', startDate: '2026-04-25', endDate: '2026-04-28', priority: 'medium' },
  ]);

  const additionalColumns: TaskListColumn<Task & { assignee?: string; priority?: 'low' | 'medium' | 'high' }>[] = [
    {
      id: 'assignee',
      header: 'Assignee',
      width: 100,
      after: 'name',
      renderCell: ({ task }) => <span>{task.assignee || '—'}</span>,
      editor: ({ task, updateTask, closeEditor }) => (
        <input
          autoFocus
          defaultValue={task.assignee || ''}
          onBlur={(e) => { updateTask({ assignee: e.target.value || undefined }); closeEditor(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { updateTask({ assignee: (e.target as HTMLInputElement).value || undefined }); closeEditor(); } if (e.key === 'Escape') closeEditor(); }}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 'inherit', padding: '0 4px' }}
        />
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      width: 80,
      after: 'name',
      renderCell: ({ task }) => {
        const colors = { low: '#888', medium: '#e6a700', high: '#e53935' };
        return <span style={{ color: colors[task.priority || 'low'], fontWeight: task.priority === 'high' ? 600 : 400 }}>{task.priority || 'low'}</span>;
      },
      editor: ({ task, updateTask, closeEditor }) => (
        <select
          autoFocus
          defaultValue={task.priority || 'low'}
          onBlur={(e) => { updateTask({ priority: (e.target as HTMLSelectElement).value as 'low' | 'medium' | 'high' }); closeEditor(); }}
          onChange={(e) => { updateTask({ priority: (e.target as HTMLSelectElement).value as 'low' | 'medium' | 'high' }); closeEditor(); }}
          onKeyDown={(e) => { if (e.key === 'Escape') closeEditor(); }}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 'inherit', cursor: 'pointer' }}
        >
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
      ),
    },
  ];

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
              className={`demo-btn ${showTaskList && showChart ? "demo-btn-active" : "demo-btn-muted"}`}
              onClick={() => { setShowTaskList(true); setShowChart(true); }}
            >
              Оба
            </button>
            <button
              className={`demo-btn ${showTaskList && !showChart ? "demo-btn-active" : "demo-btn-muted"}`}
              onClick={() => { setShowTaskList(true); setShowChart(false); }}
            >
              Только список
            </button>
            <button
              className={`demo-btn ${!showTaskList && showChart ? "demo-btn-active" : "demo-btn-muted"}`}
              onClick={() => { setShowTaskList(false); setShowChart(true); }}
            >
              Только календарь
            </button>
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
              className="demo-btn demo-btn-secondary"
              onClick={() => ganttChartRef.current?.collapseAll()}
            >
              ▲ Collapse All
            </button>
            <button
              className="demo-btn demo-btn-secondary"
              onClick={() => ganttChartRef.current?.expandAll()}
            >
              ▼ Expand All
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
            <button
              className={`demo-btn ${businessDays ? "demo-btn-active" : "demo-btn-muted"}`}
              onClick={() => setBusinessDays(!businessDays)}
            >
              {businessDays ? "Рабочие дни: ON" : "Рабочие дни: OFF"}
            </button>
            <button
              className={`demo-btn ${disableTaskDrag ? "demo-btn-danger" : "demo-btn-muted"}`}
              onClick={() => setDisableTaskDrag(!disableTaskDrag)}
            >
              {disableTaskDrag ? "Drag: OFF" : "Drag: ON"}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Поиск:</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  handleSearchResultStep(1);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  handleSearchResultStep(-1);
                }
              }}
              placeholder="Начните вводить слово из названия задачи"
              style={{
                minWidth: '280px',
                padding: '8px 12px',
                fontSize: '0.875rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                outline: 'none',
              }}
            />
            <button
              className="demo-btn demo-btn-secondary"
              onClick={() => handleSearchResultStep(-1)}
              disabled={searchResultIds.length === 0}
            >
              ↑
            </button>
            <button
              className="demo-btn demo-btn-secondary"
              onClick={() => handleSearchResultStep(1)}
              disabled={searchResultIds.length === 0}
            >
              ↓
            </button>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {searchResultIds.length === 0
                ? (searchQuery.trim() ? 'Совпадений нет' : 'Введите начало слова')
                : `${activeSearchResultIndex + 1} / ${searchResultIds.length}`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Фильтры:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filterMode === 'hide'}
                onChange={(e) => setFilterMode(e.target.checked ? 'hide' : 'highlight')}
                style={{ cursor: 'pointer' }}
              />
              Скрывать несовпадающие
            </label>
            <button
              onClick={() => {
                setTaskFilter(undefined);
                setTaskFilterId(undefined);
              }}
              style={{
                padding: '4px 12px',
                fontSize: '0.875rem',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: !taskFilterId ? '#1f2937' : 'transparent',
                color: !taskFilterId ? '#ffffff' : '#374151',
                borderColor: !taskFilterId ? '#1f2937' : '#d1d5db',
              }}
            >
              Все
            </button>
            <button
              onClick={() => {
                setTaskFilter(() => withoutDeps());
                setTaskFilterId('withoutDeps');
              }}
              style={{
                padding: '4px 12px',
                fontSize: '0.875rem',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: taskFilterId === 'withoutDeps' ? '#1f2937' : 'transparent',
                color: taskFilterId === 'withoutDeps' ? '#ffffff' : '#374151',
                borderColor: taskFilterId === 'withoutDeps' ? '#1f2937' : '#d1d5db',
              }}
            >
              Без зависимостей
            </button>
            <button
              onClick={() => {
                setTaskFilter(() => expired());
                setTaskFilterId('expired');
              }}
              style={{
                padding: '4px 12px',
                fontSize: '0.875rem',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: taskFilterId === 'expired' ? '#dc2626' : 'transparent',
                color: taskFilterId === 'expired' ? '#ffffff' : '#374151',
                borderColor: taskFilterId === 'expired' ? '#dc2626' : '#d1d5db',
              }}
            >
              Просроченные
            </button>
            <button
              onClick={() => {
                setTaskFilter(() => nameContains('Подготов'));
                setTaskFilterId('nameContains:Подготов');
              }}
              style={{
                padding: '4px 12px',
                fontSize: '0.875rem',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: '#374151',
                borderColor: '#d1d5db',
              }}
            >
              Содержит "Подготов"
            </button>
            <button
              onClick={() => {
                setTaskFilter(() => progressInRange(50, 100));
                setTaskFilterId('progressInRange:50:100');
              }}
              style={{
                padding: '4px 12px',
                fontSize: '0.875rem',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: '#374151',
                borderColor: '#d1d5db',
              }}
            >
              Прогресс 50-100%
            </button>
            <button
              onClick={() => {
                setTaskFilter(() => inDateRange(new Date(Date.UTC(2026, 1, 1)), new Date(Date.UTC(2026, 1, 10))));
                setTaskFilterId('inDateRange:2026-02-01:2026-02-10');
              }}
              style={{
                padding: '4px 12px',
                fontSize: '0.875rem',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: '#374151',
                borderColor: '#d1d5db',
              }}
            >
              1-10 февраля
            </button>
            <button
              onClick={() => {
                setTaskFilter(() => or(expired(), withoutDeps()));
                setTaskFilterId('or:expired:withoutDeps');
              }}
              style={{
                padding: '4px 12px',
                fontSize: '0.875rem',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: '#374151',
                borderColor: '#d1d5db',
              }}
            >
              Просроченные ИЛИ без зависимостей
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Масштаб:</span>
            <button
              onClick={() => setViewMode('day')}
              style={{
                padding: '4px 12px',
                fontSize: '0.875rem',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: viewMode === 'day' ? '#1f2937' : 'transparent',
                color: viewMode === 'day' ? '#ffffff' : '#374151',
                borderColor: viewMode === 'day' ? '#1f2937' : '#d1d5db',
              }}
            >
              По дням
            </button>
            <button
              onClick={() => setViewMode('week')}
              style={{
                padding: '4px 12px',
                fontSize: '0.875rem',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: viewMode === 'week' ? '#1f2937' : 'transparent',
                color: viewMode === 'week' ? '#ffffff' : '#374151',
                borderColor: viewMode === 'week' ? '#1f2937' : '#d1d5db',
              }}
            >
              По неделям
            </button>
            <button
              onClick={() => setViewMode('month')}
              style={{
                padding: '4px 12px',
                fontSize: '0.875rem',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: viewMode === 'month' ? '#1f2937' : 'transparent',
                color: viewMode === 'month' ? '#ffffff' : '#374151',
                borderColor: viewMode === 'month' ? '#1f2937' : '#d1d5db',
              }}
            >
              По месяцам
            </button>
          </div>
          <div className="demo-chart-card">
            <GanttChart
              ref={ganttChartRef}
              tasks={tasks}
              taskFilter={taskFilter}
              dayWidth={viewMode === 'month' ? 2.5 : viewMode === 'week' ? 8 : 24}
              rowHeight={36}
              onTasksChange={handleChange}
              onAdd={handleAdd}
              onDelete={handleDelete}
              onInsertAfter={handleInsertAfter}
              onReorder={handleReorder}
              containerHeight={"80dvh"}
              showTaskList={showTaskList}
              showChart={showChart}
              taskListWidth={600}
              disableTaskNameEditing={disableTaskNameEditing}
              highlightExpiredTasks={highlightExpired}
              viewMode={viewMode}
              businessDays={businessDays}
              customDays={MAIN_CHART_CUSTOM_DAYS}
              highlightedTaskIds={highlightedSearchTaskIds}
              disableTaskDrag={disableTaskDrag}
              filterMode={filterMode}
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
            <button
              className={`demo-btn ${showDependencyTaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
              onClick={() => setShowDependencyTaskList(!showDependencyTaskList)}
            >
              {showDependencyTaskList ? "Hide Task List" : "Show Task List"}
            </button>
          </div>
          <div className="demo-chart-card">
            <GanttChart
              tasks={dependencyTasks}
              onTasksChange={handleDependencyChange}
              onAdd={handleDependencyAdd}
              dayWidth={24}
              rowHeight={36}
              disableConstraints={!blockConstraints}
              showTaskList={showDependencyTaskList}
              onValidateDependencies={(result) => {
                // Validation errors are displayed in the UI
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
          <div className="demo-controls">
            <button
              className={`demo-btn ${showCascadeTaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
              onClick={() => setShowCascadeTaskList(!showCascadeTaskList)}
            >
              {showCascadeTaskList ? "Hide Task List" : "Show Task List"}
            </button>
          </div>
          <div className="demo-chart-card">
            <GanttChart
              tasks={cascadeTasks}
              onTasksChange={handleCascadeChange}
              onAdd={handleCascadeAdd}
              onCascade={(shifted) => {
                // Cascade happens silently
              }}
              dayWidth={40}
              rowHeight={40}
              containerHeight={250}
              showTaskList={showCascadeTaskList}
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
          <div className="demo-controls">
            <button
              className={`demo-btn ${showChain100TaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
              onClick={() => setShowChain100TaskList(!showChain100TaskList)}
            >
              {showChain100TaskList ? "Hide Task List" : "Show Task List"}
            </button>
          </div>
          <div className="demo-chart-card">
            <GanttChart
              tasks={chain100Tasks}
              onTasksChange={handleChain100Change}
              onAdd={handleChain100Add}
              onCascade={(shifted) => {
                // Cascade happens silently
              }}
              dayWidth={24}
              rowHeight={36}
              containerHeight={600}
              showTaskList={showChain100TaskList}
            />
          </div>
        </section>

        {/* Expired Tasks Demo (Phase 15) */}
        <section className="demo-section">
          <h2 className="demo-section-title">Подсветка просроченных задач (Phase 15)</h2>
          <p className="demo-section-desc">
            <strong>Логика просрочки по времени:</strong> ожидаемый прогресс = (прошедшие дни / длительность) × 100.<br />
            Задача красная, если: endDate &lt; today AND (progress &lt; expectedProgress OR not accepted).<br />
            Выполненные и принятые задачи (progress = 100 AND accepted = true) не красные.
          </p>
          <div className="demo-controls">
            <button
              className={`demo-btn ${showExpiredTaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
              onClick={() => setShowExpiredTaskList(!showExpiredTaskList)}
            >
              {showExpiredTaskList ? "Hide Task List" : "Show Task List"}
            </button>
          </div>
          <div className="demo-chart-card">
            <GanttChart
              tasks={expiredTasks}
              onTasksChange={handleExpiredTasksChange}
              onAdd={handleExpiredTasksAdd}
              dayWidth={40}
              rowHeight={40}
              containerHeight={250}
              showTaskList={showExpiredTaskList}
              highlightExpiredTasks={highlightExpired}
            />
          </div>
        </section>

        {/* Hierarchy Demo (Phase 19) */}
        <section className="demo-section">
          <h2 className="demo-section-title">Иерархия задач (Phase 19)</h2>
          <p className="demo-section-desc">
            <strong>Родительские задачи:</strong> отображаются жирным шрифтом с кнопкой сворачивания (-/+).<br />
            <strong>Дочерние задачи:</strong> имеют отступ и кнопку «⬆ Повысить» для удаления parentId.<br />
            <strong>Кнопка «⬇ Понизить»:</strong> появляется для корневых задач (не родителей) для создания иерархии.<br />
            <strong>Каскадное удаление:</strong> удаление родителя удаляет всех детей.<br />
            <strong>Обновление прогресса родителя:</strong> рассчитывается как взвешенное среднее по длительности детей.
          </p>
          <div className="demo-controls">
            <button
              className={`demo-btn ${showHierarchyTaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
              onClick={() => setShowHierarchyTaskList(!showHierarchyTaskList)}
            >
              {showHierarchyTaskList ? "Hide Task List" : "Show Task List"}
            </button>
          </div>
          <div className="demo-chart-card">
            <GanttChart
              tasks={hierarchyTasks}
              onTasksChange={handleHierarchyChange}
              onAdd={handleHierarchyAdd}
              onReorder={handleHierarchyReorder}
              dayWidth={40}
              rowHeight={40}
              containerHeight={300}
              showTaskList={showHierarchyTaskList}
            />
          </div>
        </section>

        {/* Custom Weekends Demo (Phase 21) */}
        <section className="demo-section">
          <h2 className="demo-section-title">Custom Weekends (Holidays)</h2>
          <p className="demo-section-desc">
            <strong>Праздники:</strong> March 8 (International Women's Day) и March 10 добавлены как выходные (подсвечены красным).<br />
            Default Saturday/Sunday выходные также применяются.
          </p>
          <div className="demo-controls">
            <button
              className={`demo-btn ${showCustomWeekendTaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
              onClick={() => setShowCustomWeekendTaskList(!showCustomWeekendTaskList)}
            >
              {showCustomWeekendTaskList ? "Hide Task List" : "Show Task List"}
            </button>
          </div>
          <div className="demo-chart-card">
            <GanttChart
              tasks={customWeekendTasks}
              dayWidth={40}
              rowHeight={40}
              containerHeight={200}
              showTaskList={showCustomWeekendTaskList}
              customDays={[
                { date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' },  // March 8 (Saturday) - holiday
                { date: new Date(Date.UTC(2026, 2, 10)), type: 'weekend' }, // March 10 (Monday) - holiday
              ]}
            />
          </div>
        </section>

        {/* Workdays Demo (Phase 21) */}
        <section className="demo-section">
          <h2 className="demo-section-title">Workdays (Exclude Weekends)</h2>
          <p className="demo-section-desc">
            <strong>Исключение выходных:</strong> March 15 (Saturday) и March 16 (Sunday) — рабочие дни (не подсвечены).<br />
            Используется для переносных рабочих дней, когда выходные перенесены на другие даты.
          </p>
          <div className="demo-controls">
            <button
              className={`demo-btn ${showWorkdaysTaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
              onClick={() => setShowWorkdaysTaskList(!showWorkdaysTaskList)}
            >
              {showWorkdaysTaskList ? "Hide Task List" : "Show Task List"}
            </button>
          </div>
          <div className="demo-chart-card">
            <GanttChart
              tasks={workdaysTasks}
              dayWidth={40}
              rowHeight={40}
              containerHeight={200}
              showTaskList={showWorkdaysTaskList}
              customDays={[
                { date: new Date(Date.UTC(2026, 2, 15)), type: 'workday' }, // March 15 (Saturday) - workday
                { date: new Date(Date.UTC(2026, 2, 16)), type: 'workday' }, // March 16 (Sunday) - workday
              ]}
            />
          </div>
        </section>

        {/* Precedence Demo (Phase 21) */}
        <section className="demo-section">
          <h2 className="demo-section-title">Precedence: Workdays &gt; Weekends</h2>
          <p className="demo-section-desc">
            <strong>Приоритет workdays над weekends:</strong> March 22 (Saturday) добавлен как workday.<br />
            По умолчанию Saturday — выходной, но workdays имеет приоритет, поэтому день НЕ подсвечен как выходной.
          </p>
          <div className="demo-controls">
            <button
              className={`demo-btn ${showPrecedenceTaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
              onClick={() => setShowPrecedenceTaskList(!showPrecedenceTaskList)}
            >
              {showPrecedenceTaskList ? "Hide Task List" : "Show Task List"}
            </button>
          </div>
          <div className="demo-chart-card">
            <GanttChart
              tasks={precedenceTasks}
              dayWidth={40}
              rowHeight={40}
              containerHeight={150}
              showTaskList={showPrecedenceTaskList}
              customDays={[
                { date: new Date(Date.UTC(2026, 2, 22)), type: 'workday' }, // March 22 (Saturday) - workday overrides default weekend
              ]}
            />
          </div>
        </section>

        {/* Custom Predicate Demo (Phase 21) */}
        <section className="demo-section">
          <h2 className="demo-section-title">Custom Predicate (Sunday-Only Weekends)</h2>
          <p className="demo-section-desc">
            <strong>Кастомный предикат:</strong> Используется предикат для выходных только по воскресеньям (6-дневная рабочая неделя).<br />
            субботы — рабочие дни (не подсвечены).
          </p>
          <div className="demo-controls">
            <button
              className={`demo-btn ${showPredicateTaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
              onClick={() => setShowPredicateTaskList(!showPredicateTaskList)}
            >
              {showPredicateTaskList ? "Hide Task List" : "Show Task List"}
            </button>
          </div>
          <div className="demo-chart-card">
            <GanttChart
              tasks={predicateTasks}
              dayWidth={40}
              rowHeight={40}
              containerHeight={150}
              showTaskList={showPredicateTaskList}
              isWeekend={(date: Date) => date.getUTCDay() === 0} // Sunday only
            />
          </div>
        </section>

        {/* Multi-Month View Demo (Phase 21) */}
        <section className="demo-section">
          <h2 className="demo-section-title">Multi-Month View with Custom Weekends</h2>
          <p className="demo-section-desc">
            <strong>Multi-month view:</strong> Кастомные выходные корректно подсвечены на границе месяцев.<br />
            March 8 и April 10 — праздники (добавлены в customDays).
          </p>
          <div className="demo-controls">
            <button
              className={`demo-btn ${showMultiMonthTaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
              onClick={() => setShowMultiMonthTaskList(!showMultiMonthTaskList)}
            >
              {showMultiMonthTaskList ? "Hide Task List" : "Show Task List"}
            </button>
          </div>
          <div className="demo-chart-card">
            <GanttChart
              tasks={multiMonthTasks}
              dayWidth={30}
              rowHeight={40}
              containerHeight={200}
              showTaskList={showMultiMonthTaskList}
              customDays={[
                { date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' },  // March 8 (holiday)
                { date: new Date(Date.UTC(2026, 3, 10)), type: 'weekend' }, // April 10 (holiday)
              ]}
            />
          </div>
        </section>

        {/* Additional Columns Demo (Phase 23) */}
        <section className="demo-section">
          <h2 className="demo-section-title">Additional Columns</h2>
          <p className="demo-section-desc">
            <strong>Custom columns:</strong> Assignee (text) и Priority (select) — добавлены через <code>additionalColumns</code> проп.
            Кликните на ячейку для редактирования.
          </p>
          <div className="demo-chart-card">
            <GanttChart<Task & { assignee?: string; priority?: 'low' | 'medium' | 'high' }>
              tasks={additionalColumnsTasks}
              dayWidth={30}
              rowHeight={40}
              containerHeight={280}
              showTaskList={true}
              showChart={true}
              taskListWidth={400}
              onTasksChange={(changed) => setAdditionalColumnsTasks(prev => {
                const map = new Map(prev.map(t => [t.id, t]));
                for (const t of changed) map.set(t.id, t);
                return [...map.values()];
              })}
              additionalColumns={additionalColumns}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

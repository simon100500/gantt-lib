"use client";

import { useState, useCallback, useRef } from "react";
import { GanttChart, type Task, type GanttChartHandle } from "gantt-lib";

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
  const [showDependencyTaskList, setShowDependencyTaskList] = useState(false);
  const [showCascadeTaskList, setShowCascadeTaskList] = useState(false);
  const [showChain100TaskList, setShowChain100TaskList] = useState(false);
  const [showExpiredTaskList, setShowExpiredTaskList] = useState(false);
  const [disableTaskNameEditing, setDisableTaskNameEditing] = useState(false);
  const [highlightExpired, setHighlightExpired] = useState(true);

  // Ref for the main GanttChart to access scrollToToday method
  const ganttChartRef = useRef<GanttChartHandle>(null);

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
      const index = prev.findIndex(t => t.id === taskId);
      if (index === -1) return prev;
      // Insert after the found index
      const newTasks = [...prev];
      newTasks.splice(index + 1, 0, newTask);
      return newTasks;
    });
  }, []);

  const handleReorder = useCallback((reorderedTasks: Task[], movedTaskId?: string, inferredParentId?: string) => {
    console.log('=== PAGE handleReorder START ===');
    console.log('[INPUTS]', {
      movedTaskId,
      inferredParentId,
      reorderedTasksCount: reorderedTasks.length,
      reorderedTasks: reorderedTasks.map((t, i) => ({ id: t.id, name: t.name, parentId: t.parentId, index: i }))
    });

    // Use the full reorderedTasks array as-is (already normalized by GanttChart.handleReorder)
    // The reorderedTasks array has the correct order and parentId updates applied
    setTasks(reorderedTasks);

    console.log('=== PAGE handleReorder END ===\n');
  }, []);

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
              onTasksChange={handleChange}
              onAdd={handleAdd}
              onDelete={handleDelete}
              onInsertAfter={handleInsertAfter}
              onReorder={handleReorder}
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
              onCascade={(shifted) => console.log('Cascade:', shifted.map(t => `${t.name}: ${t.startDate}`))}
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
              onCascade={(shifted) => console.log(`Cascade: ${shifted.length} tasks shifted`)}
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
            <strong>Логика просрочки по времени:</strong> ожидаемый прогресс = (прошедшие дни / длительность) × 100.<br/>
            Задача красная, если: endDate &lt; today AND (progress &lt; expectedProgress OR not accepted).<br/>
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
            <strong>Родительские задачи:</strong> отображаются жирным шрифтом с кнопкой сворачивания (-/+).<br/>
            <strong>Дочерние задачи:</strong> имеют отступ и кнопку «⬆ Повысить» для удаления parentId.<br/>
            <strong>Кнопка «⬇ Понизить»:</strong> появляется для корневых задач (не родителей) для создания иерархии.<br/>
            <strong>Каскадное удаление:</strong> удаление родителя удаляет всех детей.<br/>
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
      </div>
    </main>
  );
}

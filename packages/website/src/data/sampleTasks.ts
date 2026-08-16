import {
  type Task,
  createCustomDayPredicate,
  reflowTasksOnModeSwitch,
  buildTaskRangeFromStart,
  computeParentDates,
  parseUTCDate,
} from "gantt-lib";

export const MAIN_CHART_CUSTOM_DAYS = [
  { date: new Date(Date.UTC(2026, 2, 9)), type: 'weekend' as const },
  { date: new Date(Date.UTC(2026, 4, 1)), type: 'weekend' as const },
  { date: new Date(Date.UTC(2026, 4, 11)), type: 'weekend' as const },
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' as const },
];

export const MAIN_CHART_WEEKEND_PREDICATE = createCustomDayPredicate({ customDays: MAIN_CHART_CUSTOM_DAYS });

export const reflowTasksForBusinessDays = (sourceTasks: Task[], weekendPredicate: (date: Date) => boolean): Task[] => {
  return reflowTasksOnModeSwitch(sourceTasks, true, weekendPredicate);
};

const shiftIsoDate = (value: string | Date, days: number): string => {
  const source = typeof value === 'string'
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);
  const shifted = new Date(Date.UTC(
    source.getUTCFullYear(),
    source.getUTCMonth(),
    source.getUTCDate() + days
  ));
  return shifted.toISOString().slice(0, 10);
};

const toIsoDate = (date: Date): string => date.toISOString().split('T')[0];

/**
 * Demo task input. Leaf tasks declare their start date, working-day duration and
 * dependencies (with lags) — the end date is derived by the core via
 * buildTaskRangeFromStart. Parent groups declare no dates at all: their range is
 * rolled up from children by computeParentDates.
 */
type SampleTaskInput = Omit<Task, 'startDate' | 'endDate'> & {
  startDate?: string;
  durationDays?: number;
};

export const createSampleTasks = (): Task[] => {
  const inputs: SampleTaskInput[] = [
    // GROUP 1 — Подготовительные работы
    {
      id: 'g1',
      name: 'Подготовительные работы',
      progress: 100,
      accepted: true,
      locked: true,
      dependencies: [],
    },
    {
      id: 'g1-1',
      name: 'Геодезическая разбивка',
      startDate: '2026-02-01',
      durationDays: 2,
      baselineStartDate: '2026-01-30',
      baselineEndDate: '2026-02-02',
      progress: 100,
      accepted: true,
      parentId: 'g1',
      dependencies: [],
    },
    {
      id: 'g1-2',
      name: 'Ограждение площадки',
      startDate: '2026-02-03',
      durationDays: 4,
      progress: 100,
      accepted: true,
      parentId: 'g1',
      dependencies: [{ taskId: 'g1-1', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g1-3',
      name: 'Временные дороги',
      startDate: '2026-02-05',
      durationDays: 4,
      progress: 100,
      accepted: true,
      parentId: 'g1',
      dependencies: [{ taskId: 'g1-1', type: 'SS' as const, lag: 2 }],
    },
    {
      id: 'g1-4',
      name: 'Подключение временных коммуникаций',
      startDate: '2026-02-08',
      durationDays: 4,
      progress: 100,
      accepted: false,
      parentId: 'g1',
      dependencies: [{ taskId: 'g1-2', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g1-5',
      name: 'Установка строительного городка',
      startDate: '2026-02-10',
      durationDays: 4,
      progress: 100,
      accepted: true,
      parentId: 'g1',
      dependencies: [{ taskId: 'g1-3', type: 'FS' as const, lag: 0 }],
    },

    // GROUP 2 — Земляные работы
    {
      id: 'g2',
      name: 'Земляные работы',
      progress: 100,
      accepted: true,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g2-1',
      name: 'Разработка котлована',
      startDate: '2026-02-16',
      durationDays: 5,
      progress: 100,
      accepted: true,
      parentId: 'g2',
      dependencies: [{ taskId: 'g1', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g2-2',
      name: 'Вывоз грунта',
      startDate: '2026-02-17',
      durationDays: 5,
      progress: 100,
      accepted: true,
      parentId: 'g2',
      dependencies: [{ taskId: 'g2-1', type: 'SS' as const, lag: 1 }],
    },
    {
      id: 'g2-3',
      name: 'Зачистка дна котлована',
      startDate: '2026-02-23',
      durationDays: 3,
      progress: 100,
      accepted: true,
      parentId: 'g2',
      dependencies: [{ taskId: 'g2-1', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g2-4',
      name: 'Песчаная подушка',
      startDate: '2026-02-25',
      durationDays: 3,
      baselineStartDate: '2026-02-24',
      baselineEndDate: '2026-02-26',
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
      durationDays: 1,
      progress: 100,
      accepted: true,
      parentId: 'g2',
      dependencies: [{ taskId: 'g2-4', type: 'FS' as const, lag: 0 }],
    },

    // GROUP 3 — Фундамент
    {
      id: 'g3',
      name: 'Фундамент',
      progress: 85,
      accepted: false,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g3-1',
      name: 'Опалубка фундамента',
      startDate: '2026-03-02',
      durationDays: 5,
      progress: 100,
      accepted: true,
      parentId: 'g3',
      dependencies: [{ taskId: 'g2', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g3-2',
      name: 'Армирование подошвы',
      startDate: '2026-03-04',
      durationDays: 3,
      progress: 100,
      accepted: true,
      parentId: 'g3',
      dependencies: [{ taskId: 'g3-1', type: 'SS' as const, lag: 2 }],
    },
    {
      id: 'g3-3',
      name: 'Бетонная подготовка',
      startDate: '2026-03-07',
      durationDays: 1,
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
      durationDays: 6,
      progress: 100,
      accepted: false,
      parentId: 'g3',
      dependencies: [{ taskId: 'g3-2', type: 'FF' as const, lag: 0 }],
    },
    {
      id: 'g3-5',
      name: 'Уход за бетоном',
      startDate: '2026-03-15',
      durationDays: 5,
      baselineStartDate: '2026-03-13',
      baselineEndDate: '2026-03-20',
      progress: 80,
      accepted: false,
      parentId: 'g3',
      dependencies: [{ taskId: 'g3-4', type: 'FS' as const, lag: -1 }],
    },
    {
      id: 'g3-6',
      name: 'Гидроизоляция',
      startDate: '2026-03-22',
      durationDays: 4,
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
      durationDays: 2,
      progress: 40,
      accepted: false,
      parentId: 'g3',
      dependencies: [{ taskId: 'g3-6', type: 'FS' as const, lag: 0 }],
    },

    // GROUP 4 — Каркас здания
    {
      id: 'g4',
      name: 'Каркас здания',
      progress: 45,
      accepted: false,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g4-1',
      name: 'Монтаж колонн 1 этажа',
      startDate: '2026-03-29',
      durationDays: 5,
      progress: 80,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g3', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g4-2',
      name: 'Монтаж балок перекрытия',
      startDate: '2026-04-03',
      durationDays: 6,
      baselineStartDate: '2026-04-01',
      baselineEndDate: '2026-04-10',
      progress: 70,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-1', type: 'SS' as const, lag: 5 }],
    },
    {
      id: 'g4-3',
      name: 'Монтаж плит перекрытия',
      startDate: '2026-04-10',
      durationDays: 6,
      progress: 55,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-2', type: 'FF' as const, lag: -2 }],
    },
    {
      id: 'g4-4',
      name: 'Монтаж колонн 2 этажа',
      startDate: '2026-04-15',
      durationDays: 8,
      progress: 35,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-3', type: 'SS' as const, lag: 5 }],
    },
    {
      id: 'g4-5',
      name: 'Перекрытие 2 этажа',
      startDate: '2026-04-22',
      durationDays: 7,
      progress: 20,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-4', type: 'SS' as const, lag: 5 }],
    },
    {
      id: 'g4-6',
      name: 'Монтаж стропил',
      startDate: '2026-05-01',
      durationDays: 5,
      progress: 10,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-5', type: 'FS' as const, lag: 0 }],
    },

    // GROUP 5 — Кровля
    {
      id: 'g5',
      name: 'Кровля',
      progress: 5,
      accepted: false,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g5-1',
      name: 'Монтаж обрешётки',
      startDate: '2026-05-10',
      durationDays: 4,
      progress: 15,
      accepted: false,
      parentId: 'g5',
      dependencies: [{ taskId: 'g4', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g5-2',
      name: 'Укладка утеплителя',
      startDate: '2026-05-13',
      durationDays: 6,
      progress: 5,
      accepted: false,
      parentId: 'g5',
      dependencies: [{ taskId: 'g5-1', type: 'SS' as const, lag: 3 }],
    },
    {
      id: 'g5-3',
      name: 'Монтаж кровельного покрытия',
      startDate: '2026-05-18',
      durationDays: 8,
      progress: 0,
      accepted: false,
      parentId: 'g5',
      dependencies: [{ taskId: 'g5-1', type: 'FS' as const, lag: 3 }],
    },
    {
      id: 'g5-4',
      name: 'Водосточная система',
      startDate: '2026-05-25',
      durationDays: 5,
      progress: 0,
      accepted: false,
      parentId: 'g5',
      dependencies: [{ taskId: 'g5-3', type: 'FF' as const, lag: 3 }],
    },

    // GROUP 6 — Наружные стены и фасад
    {
      id: 'g6',
      name: 'Наружные стены и фасад',
      progress: 10,
      accepted: false,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g6-1',
      name: 'Кладка наружных стен 1 эт.',
      startDate: '2026-05-01',
      durationDays: 10,
      progress: 20,
      accepted: false,
      parentId: 'g6',
      dependencies: [{ taskId: 'g4-3', type: 'FS' as const, lag: 13 }],
    },
    {
      id: 'g6-2',
      name: 'Кладка наружных стен 2 эт.',
      startDate: '2026-05-15',
      durationDays: 12,
      progress: 5,
      accepted: false,
      parentId: 'g6',
      dependencies: [{ taskId: 'g6-1', type: 'SS' as const, lag: 14 }],
    },
    {
      id: 'g6-3',
      name: 'Монтаж оконных блоков',
      startDate: '2026-06-01',
      durationDays: 8,
      progress: 0,
      accepted: false,
      parentId: 'g6',
      dependencies: [{ taskId: 'g6-2', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g6-4',
      name: 'Утепление фасада',
      startDate: '2026-06-05',
      durationDays: 7,
      progress: 0,
      accepted: false,
      parentId: 'g6',
      dependencies: [{ taskId: 'g6-3', type: 'SS' as const, lag: 4 }],
    },
    {
      id: 'g6-5',
      name: 'Финишная отделка фасада',
      startDate: '2026-06-12',
      durationDays: 6,
      baselineStartDate: '2026-06-08',
      baselineEndDate: '2026-06-18',
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
      progress: 5,
      accepted: false,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g7-1',
      name: 'Разводка электросетей',
      startDate: '2026-05-15',
      durationDays: 12,
      progress: 10,
      accepted: false,
      parentId: 'g7',
      dependencies: [{ taskId: 'g4-3', type: 'FS' as const, lag: 27 }],
    },
    {
      id: 'g7-2',
      name: 'Сантехнические работы',
      startDate: '2026-05-20',
      durationDays: 16,
      progress: 5,
      accepted: false,
      parentId: 'g7',
      dependencies: [{ taskId: 'g7-1', type: 'SS' as const, lag: 5 }],
    },
    {
      id: 'g7-3',
      name: 'Вентиляция и кондиционирование',
      startDate: '2026-06-01',
      durationDays: 15,
      progress: 0,
      accepted: false,
      parentId: 'g7',
      dependencies: [{ taskId: 'g7-1', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g7-4',
      name: 'Слаботочные системы (охрана/связь)',
      startDate: '2026-06-10',
      durationDays: 12,
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
      durationDays: 5,
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
      progress: 0,
      accepted: false,
      divider: 'top' as const,
      dependencies: [],
    },
    {
      id: 'g8-1',
      name: 'Штукатурка стен',
      startDate: '2026-07-01',
      durationDays: 13,
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g7', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g8-2',
      name: 'Стяжка пола',
      startDate: '2026-07-05',
      durationDays: 11,
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-1', type: 'SS' as const, lag: 4 }],
    },
    {
      id: 'g8-3',
      name: 'Чистовая отделка',
      startDate: '2026-07-20',
      durationDays: 13,
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-1', type: 'FS' as const, lag: 2 }],
    },
    {
      id: 'g8-4',
      name: 'Установка дверей и фурнитуры',
      startDate: '2026-07-28',
      durationDays: 9,
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-3', type: 'SS' as const, lag: 8 }],
    },
    {
      id: 'g8-ms-1',
      name: 'Комиссия готовности к сдаче',
      startDate: '2026-08-08',
      durationDays: 1,
      type: 'milestone' as const,
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-4', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g8-5',
      name: 'Сдача объекта',
      startDate: '2026-08-10',
      durationDays: 1,
      type: 'milestone' as const,
      progress: 0,
      accepted: false,
      locked: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-ms-1', type: 'FS' as const, lag: 2 }],
    },
  ];

  // 1. Leaf tasks: derive endDate from startDate + working-day duration via the core.
  let tasks: Task[] = inputs.map((input): Task => {
    const { startDate, durationDays, ...rest } = input;
    if (startDate == null || durationDays == null) {
      // Parent group — placeholder, rolled up from children below.
      return { ...rest, startDate: '', endDate: '' } as unknown as Task;
    }
    const range = buildTaskRangeFromStart(
      parseUTCDate(startDate),
      durationDays,
      true,
      MAIN_CHART_WEEKEND_PREDICATE
    );
    return {
      ...rest,
      startDate: toIsoDate(range.start),
      endDate: toIsoDate(range.end),
    } as Task;
  });

  // 2. Parent groups: roll up dates from their children.
  const childParentIds = new Set(
    tasks.filter((task) => task.parentId).map((task) => task.parentId)
  );
  tasks = tasks.map((task) => {
    if (!childParentIds.has(task.id)) return task;
    const { startDate, endDate } = computeParentDates(task.id, tasks);
    return { ...task, startDate: toIsoDate(startDate), endDate: toIsoDate(endDate) };
  });

  return tasks.map((task) => ({
    ...task,
    baselineStartDate: task.baselineStartDate ?? shiftIsoDate(task.startDate, -2),
    baselineEndDate: task.baselineEndDate ?? shiftIsoDate(task.endDate, -2),
  }));
};

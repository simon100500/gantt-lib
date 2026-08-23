import {
  type Task,
  createCustomDayPredicate,
  reflowTasksOnModeSwitch,
  buildTaskRangeFromStart,
  buildTaskRangeFromEnd,
  parseUTCDate,
  calculateSuccessorDate,
  computeLagFromDates,
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
 * Demo task input. Leaf tasks declare NO explicit dates — only their working-day
 * duration, dependency links and lags. The whole schedule is then derived
 * forward (topological relaxation) from duration + links + lag, so the dates the
 * chart draws always agree with the stored lag values.
 *
 * Parent groups declare no duration either: their range is rolled up from
 * children by computeParentDates.
 */
type SampleTaskInput = Omit<Task, 'startDate' | 'endDate'> & {
  /** Working-day duration. Present on leaves, absent on parent groups. */
  durationDays?: number;
};

/** A derived leaf: a Task that still carries its working-day duration. */
type LeafTask = Task & { durationDays: number };

/**
 * Derive every leaf's start/end from its dependencies (type + lag) and duration.
 * Tasks with no incoming links are anchored at `anchorStart`. The relaxation is
 * monotonic (dates only ever move forward), so it converges within a bounded
 * number of passes regardless of ordering.
 */
function deriveSchedule(
  inputs: SampleTaskInput[],
  anchorStart: Date,
  businessDays: boolean,
  weekendPredicate: (date: Date) => boolean
): Task[] {
  const toLeaf = (i: SampleTaskInput): LeafTask => {
    const range = buildTaskRangeFromStart(anchorStart, i.durationDays!, businessDays, weekendPredicate);
    return {
      ...i,
      durationDays: i.durationDays,
      startDate: toIsoDate(range.start),
      endDate: toIsoDate(range.end),
      dependencies: i.dependencies,
    } as LeafTask;
  };

  const leaves: LeafTask[] = inputs.filter(i => i.durationDays != null).map(toLeaf);
  const parents = inputs
    .filter(i => i.durationDays == null)
    .map(i => ({ ...i, startDate: '', endDate: '' }) as Task);

  const taskById = new Map<string, Task>();
  parents.forEach(p => taskById.set(p.id, p));
  leaves.forEach(l => taskById.set(l.id, l));

  // Children of each parent over the CURRENT leaf set.
  const childrenOf = (parentId: string): Task[] =>
    leaves.filter(l => l.parentId === parentId);

  const resolveRange = (id: string): { start: Date; end: Date } => {
    const t = taskById.get(id);
    if (!t) return { start: anchorStart, end: anchorStart };
    if (t.endDate === '') {
      // Parent group: roll up from its current children.
      const kids = childrenOf(id);
      if (kids.length === 0) return { start: anchorStart, end: anchorStart };
      const start = new Date(Math.min(...kids.map(k => parseUTCDate(k.startDate).getTime())));
      const end = new Date(Math.max(...kids.map(k => parseUTCDate(k.endDate).getTime())));
      return { start, end };
    }
    return { start: parseUTCDate(t.startDate), end: parseUTCDate(t.endDate) };
  };

  const desiredRange = (leaf: LeafTask): { start: Date; end: Date } | null => {
    if (!leaf.dependencies || leaf.dependencies.length === 0) return null; // anchored root
    const duration = leaf.durationDays!;
    let best: { start: Date; end: Date } | null = null;
    for (const dep of leaf.dependencies) {
      const pred = taskById.get(dep.taskId);
      if (!pred) continue;
      const { start: predStart, end: predEnd } = resolveRange(dep.taskId);
      const constraint = calculateSuccessorDate(
        predStart,
        predEnd,
        dep.type,
        dep.lag ?? 0,
        businessDays,
        weekendPredicate,
        leaf.type
      );
      const candidate = dep.type === 'FS' || dep.type === 'SS'
        ? buildTaskRangeFromStart(constraint, duration, businessDays, weekendPredicate)
        : buildTaskRangeFromEnd(constraint, duration, businessDays, weekendPredicate);
      if (
        !best ||
        candidate.start.getTime() > best.start.getTime() ||
        (candidate.start.getTime() === best.start.getTime() && candidate.end.getTime() > best.end.getTime())
      ) {
        best = candidate;
      }
    }
    return best;
  };

  // Monotonic relaxation: recompute until nothing moves.
  const maxIterations = leaves.length * 3 + 8;
  for (let iter = 0; iter < maxIterations; iter += 1) {
    let changed = false;
    for (const leaf of leaves) {
      const next = desiredRange(leaf);
      if (!next) continue;
      const current = parseUTCDate(leaf.startDate);
      if (current.getTime() === next.start.getTime()) continue;
      leaf.startDate = toIsoDate(next.start);
      leaf.endDate = toIsoDate(next.end);
      changed = true;
    }
    if (!changed) break;
  }

  // Roll parents up from their (final) children.
  for (const parent of parents) {
    const kids = childrenOf(parent.id);
    if (kids.length === 0) continue;
    const start = new Date(Math.min(...kids.map(k => parseUTCDate(k.startDate).getTime())));
    const end = new Date(Math.max(...kids.map(k => parseUTCDate(k.endDate).getTime())));
    parent.startDate = toIsoDate(start);
    parent.endDate = toIsoDate(end);
  }

  return [...leaves, ...parents];
}

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
      durationDays: 4,
      progress: 100,
      accepted: true,
      parentId: 'g1',
      dependencies: [{ taskId: 'g1-1', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g1-3',
      name: 'Временные дороги',
      durationDays: 4,
      progress: 100,
      accepted: true,
      parentId: 'g1',
      dependencies: [{ taskId: 'g1-1', type: 'SS' as const, lag: 2 }],
    },
    {
      id: 'g1-4',
      name: 'Подключение временных коммуникаций',
      durationDays: 4,
      progress: 100,
      accepted: false,
      parentId: 'g1',
      dependencies: [{ taskId: 'g1-2', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g1-5',
      name: 'Установка строительного городка',
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
      durationDays: 5,
      progress: 100,
      accepted: true,
      parentId: 'g2',
      dependencies: [{ taskId: 'g1', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g2-2',
      name: 'Вывоз грунта',
      durationDays: 5,
      progress: 100,
      accepted: true,
      parentId: 'g2',
      dependencies: [{ taskId: 'g2-1', type: 'SS' as const, lag: 1 }],
    },
    {
      id: 'g2-3',
      name: 'Зачистка дна котлована',
      durationDays: 3,
      progress: 100,
      accepted: true,
      parentId: 'g2',
      dependencies: [{ taskId: 'g2-1', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g2-4',
      name: 'Песчаная подушка',
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
      durationDays: 5,
      progress: 100,
      accepted: true,
      parentId: 'g3',
      dependencies: [{ taskId: 'g2', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g3-2',
      name: 'Армирование подошвы',
      durationDays: 3,
      progress: 100,
      accepted: true,
      parentId: 'g3',
      dependencies: [{ taskId: 'g3-1', type: 'SS' as const, lag: 2 }],
    },
    {
      id: 'g3-3',
      name: 'Бетонная подготовка',
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
      durationDays: 6,
      progress: 100,
      accepted: false,
      parentId: 'g3',
      dependencies: [{ taskId: 'g3-2', type: 'FF' as const, lag: 0 }],
    },
    {
      id: 'g3-5',
      name: 'Уход за бетоном',
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
      durationDays: 5,
      progress: 80,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g3', type: 'FS' as const, lag: 1 }],
    },
    {
      id: 'g4-2',
      name: 'Монтаж балок перекрытия',
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
      durationDays: 6,
      progress: 55,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-2', type: 'FF' as const, lag: -2 }],
    },
    {
      id: 'g4-4',
      name: 'Монтаж колонн 2 этажа',
      durationDays: 8,
      progress: 35,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-3', type: 'SS' as const, lag: 5 }],
    },
    {
      id: 'g4-5',
      name: 'Перекрытие 2 этажа',
      durationDays: 7,
      progress: 20,
      accepted: false,
      parentId: 'g4',
      dependencies: [{ taskId: 'g4-4', type: 'SS' as const, lag: 5 }],
    },
    {
      id: 'g4-6',
      name: 'Монтаж стропил',
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
      durationDays: 4,
      progress: 15,
      accepted: false,
      parentId: 'g5',
      dependencies: [{ taskId: 'g4', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g5-2',
      name: 'Укладка утеплителя',
      durationDays: 6,
      progress: 5,
      accepted: false,
      parentId: 'g5',
      dependencies: [{ taskId: 'g5-1', type: 'SS' as const, lag: 3 }],
    },
    {
      id: 'g5-3',
      name: 'Монтаж кровельного покрытия',
      durationDays: 8,
      progress: 0,
      accepted: false,
      parentId: 'g5',
      dependencies: [{ taskId: 'g5-1', type: 'FS' as const, lag: 3 }],
    },
    {
      id: 'g5-4',
      name: 'Водосточная система',
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
      durationDays: 10,
      progress: 20,
      accepted: false,
      parentId: 'g6',
      dependencies: [{ taskId: 'g4-3', type: 'FS' as const, lag: 13 }],
    },
    {
      id: 'g6-2',
      name: 'Кладка наружных стен 2 эт.',
      durationDays: 12,
      progress: 5,
      accepted: false,
      parentId: 'g6',
      dependencies: [{ taskId: 'g6-1', type: 'SS' as const, lag: 14 }],
    },
    {
      id: 'g6-3',
      name: 'Монтаж оконных блоков',
      durationDays: 8,
      progress: 0,
      accepted: false,
      parentId: 'g6',
      dependencies: [{ taskId: 'g6-2', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g6-4',
      name: 'Утепление фасада',
      durationDays: 7,
      progress: 0,
      accepted: false,
      parentId: 'g6',
      dependencies: [{ taskId: 'g6-3', type: 'SS' as const, lag: 4 }],
    },
    {
      id: 'g6-5',
      name: 'Финишная отделка фасада',
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
      durationDays: 12,
      progress: 10,
      accepted: false,
      parentId: 'g7',
      dependencies: [{ taskId: 'g4-3', type: 'FS' as const, lag: 27 }],
    },
    {
      id: 'g7-2',
      name: 'Сантехнические работы',
      durationDays: 16,
      progress: 5,
      accepted: false,
      parentId: 'g7',
      dependencies: [{ taskId: 'g7-1', type: 'SS' as const, lag: 5 }],
    },
    {
      id: 'g7-3',
      name: 'Вентиляция и кондиционирование',
      durationDays: 15,
      progress: 0,
      accepted: false,
      parentId: 'g7',
      dependencies: [{ taskId: 'g7-1', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g7-4',
      name: 'Слаботочные системы (охрана/связь)',
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
      durationDays: 13,
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g7', type: 'FS' as const, lag: 0 }],
    },
    {
      id: 'g8-2',
      name: 'Стяжка пола',
      durationDays: 11,
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-1', type: 'SS' as const, lag: 4 }],
    },
    {
      id: 'g8-3',
      name: 'Чистовая отделка',
      durationDays: 13,
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-1', type: 'FS' as const, lag: 2 }],
    },
    {
      id: 'g8-4',
      name: 'Установка дверей и фурнитуры',
      durationDays: 9,
      progress: 0,
      accepted: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-3', type: 'SS' as const, lag: 8 }],
    },
    {
      id: 'g8-ms-1',
      name: 'Комиссия готовности к сдаче',
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
      durationDays: 1,
      type: 'milestone' as const,
      progress: 0,
      accepted: false,
      locked: false,
      parentId: 'g8',
      dependencies: [{ taskId: 'g8-ms-1', type: 'FS' as const, lag: 2 }],
    },
  ];

  // 1. Derive the whole schedule from duration + links + lags (no hardcoded dates).
  const tasks: Task[] = deriveSchedule(
    inputs,
    parseUTCDate('2026-02-01'), // project anchor (Геодезическая разбивка)
    true,
    MAIN_CHART_WEEKEND_PREDICATE
  );

  // 2. Recompute every stored lag from the derived dates. When a task has several
  //    dependencies only one is binding, so the other edges must reflect the actual
  //    gap — this keeps every lag label identical to the gap the chart draws.
  const byId = new Map(tasks.map(task => [task.id, task]));
  for (const task of tasks) {
    if (!task.dependencies || task.dependencies.length === 0) continue;
    task.dependencies = task.dependencies.map(dep => {
      const pred = byId.get(dep.taskId);
      if (!pred) return dep;
      const pS = parseUTCDate(pred.startDate);
      const pE = pred.type === 'milestone'
        ? new Date(pS.getTime())
        : parseUTCDate(pred.endDate);
      const lag = computeLagFromDates(
        dep.type,
        pS,
        pE,
        parseUTCDate(task.startDate),
        parseUTCDate(task.endDate),
        true,
        MAIN_CHART_WEEKEND_PREDICATE,
        task.type
      );
      return { ...dep, lag };
    });
  }

  return tasks.map((task) => ({
    ...task,
    baselineStartDate: task.baselineStartDate ?? shiftIsoDate(task.startDate, -2),
    baselineEndDate: task.baselineEndDate ?? shiftIsoDate(task.endDate, -2),
  }));
};
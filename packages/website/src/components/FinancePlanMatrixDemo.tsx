"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GanttChart, type Task, type TaskListColumn, type TableMatrixColumn, type TableMatrixColumnGroup } from "gantt-lib";

type FinanceTask = Task & {
  owner: string;
  budget: number;
  paid: number;
  plannedByPeriod: Record<string, number>;
  isTotal?: boolean;
};

type MatrixView = 'week' | 'month';

type PeriodDefinition = {
  id: string;
  label: string;
  groupId?: string;
  startDate: string | Date;
  endDate: string | Date;
};

type MatrixCellModalState = {
  taskName: string;
  periodLabel: string;
  value: number;
} | null;

const financeTasks: FinanceTask[] = [
  {
    id: "phase-1",
    name: "Подготовительный этап",
    startDate: "2026-04-01",
    endDate: "2026-04-20",
    owner: "Контур 0",
    budget: 2750000,
    paid: 920000,
    plannedByPeriod: {
      "2026-04-w1": 950000,
      "2026-04-w2": 600000,
      "2026-04-w3": 350000,
      "2026-04-w4": 250000,
      "2026-04": 2150000,
      "2026-05": 600000,
    },
  },
  {
    id: "fp-1",
    name: "Подготовка площадки",
    startDate: "2026-04-01",
    endDate: "2026-04-12",
    parentId: "phase-1",
    owner: "Генподряд",
    budget: 1550000,
    paid: 620000,
    plannedByPeriod: {
      "2026-04-w1": 950000,
      "2026-04-w2": 600000,
      "2026-04": 1550000,
    },
  },
  {
    id: "fp-1-2",
    name: "Временные сети и бытовой городок",
    startDate: "2026-04-13",
    endDate: "2026-05-05",
    parentId: "phase-1",
    owner: "Субподряд",
    budget: 1200000,
    paid: 300000,
    plannedByPeriod: {
      "2026-04-w3": 350000,
      "2026-04-w4": 250000,
      "2026-05-w1": 350000,
      "2026-05-w2": 250000,
      "2026-04": 600000,
      "2026-05": 600000,
    },
  },
  {
    id: "phase-2",
    name: "Коробка здания",
    startDate: "2026-04-08",
    endDate: "2026-06-15",
    owner: "Монолит",
    budget: 10180000,
    paid: 1310000,
    plannedByPeriod: {
      "2026-04-w2": 640000,
      "2026-04-w3": 910000,
      "2026-04-w4": 1180000,
      "2026-05-w1": 1240000,
      "2026-05-w2": 1450000,
      "2026-05-w3": 930000,
      "2026-05-w4": 1050000,
      "2026-06-w1": 1220000,
      "2026-04": 2730000,
      "2026-05": 4670000,
      "2026-06": 2780000,
    },
  },
  {
    id: "fp-2",
    name: "Фундамент",
    startDate: "2026-04-08",
    endDate: "2026-05-18",
    parentId: "phase-2",
    owner: "Монолит",
    budget: 4860000,
    paid: 1310000,
    plannedByPeriod: {
      "2026-04-w2": 640000,
      "2026-04-w3": 910000,
      "2026-04-w4": 1180000,
      "2026-05-w1": 820000,
      "2026-05-w2": 690000,
      "2026-04": 2730000,
      "2026-05": 2130000,
    },
  },
  {
    id: "fp-3",
    name: "Каркас",
    startDate: "2026-05-01",
    endDate: "2026-06-15",
    parentId: "phase-2",
    owner: "Монолит",
    budget: 5320000,
    paid: 0,
    plannedByPeriod: {
      "2026-05-w1": 420000,
      "2026-05-w2": 760000,
      "2026-05-w3": 930000,
      "2026-05-w4": 1050000,
      "2026-06-w1": 1220000,
      "2026-05": 3160000,
      "2026-06": 2160000,
    },
  },
  {
    id: "fp-2-1",
    name: "Земляные работы под фундамент",
    startDate: "2026-04-08",
    endDate: "2026-04-26",
    parentId: "fp-2",
    owner: "Монолит",
    budget: 1740000,
    paid: 510000,
    plannedByPeriod: {
      "2026-04-w2": 640000,
      "2026-04-w3": 720000,
      "2026-04-w4": 380000,
      "2026-04": 1740000,
    },
  },
  {
    id: "fp-2-1-1",
    name: "Разработка котлована",
    startDate: "2026-04-08",
    endDate: "2026-04-18",
    parentId: "fp-2-1",
    owner: "Монолит",
    budget: 940000,
    paid: 310000,
    plannedByPeriod: {
      "2026-04-w2": 640000,
      "2026-04-w3": 300000,
      "2026-04": 940000,
    },
  },
  {
    id: "fp-2-1-2",
    name: "Щебеночная подготовка",
    startDate: "2026-04-18",
    endDate: "2026-04-26",
    parentId: "fp-2-1",
    owner: "Монолит",
    budget: 800000,
    paid: 200000,
    plannedByPeriod: {
      "2026-04-w3": 420000,
      "2026-04-w4": 380000,
      "2026-04": 800000,
    },
  },
  {
    id: "fp-2-2",
    name: "Монолит плиты",
    startDate: "2026-04-20",
    endDate: "2026-05-18",
    parentId: "fp-2",
    owner: "Монолит",
    budget: 3120000,
    paid: 800000,
    plannedByPeriod: {
      "2026-04-w3": 190000,
      "2026-04-w4": 800000,
      "2026-05-w1": 820000,
      "2026-05-w2": 690000,
      "2026-05-w3": 620000,
      "2026-04": 990000,
      "2026-05": 2130000,
    },
  },
  {
    id: "fp-2-2-1",
    name: "Армирование плиты",
    startDate: "2026-04-20",
    endDate: "2026-05-10",
    parentId: "fp-2-2",
    owner: "Монолит",
    budget: 1250000,
    paid: 420000,
    plannedByPeriod: {
      "2026-04-w3": 1000000000,
      "2026-04-w4": 10000,
      "2026-05-w1": 400000,
      "2026-05-w2": 300000,
      "2026-04": 1000010000,
      "2026-05": 700000,
    },
  },
  {
    id: "fp-2-2-2",
    name: "Бетонирование плиты",
    startDate: "2026-04-27",
    endDate: "2026-05-18",
    parentId: "fp-2-2",
    owner: "Монолит",
    budget: 1870000,
    paid: 380000,
    plannedByPeriod: {
      "2026-04-w5": 440000,
      "2026-05-w1": 420000,
      "2026-05-w2": 390000,
      "2026-05-w3": 620000,
      "2026-04": 440000,
      "2026-05": 1430000,
    },
  },
  {
    id: "fp-3-1",
    name: "Колонны и ядра",
    startDate: "2026-05-01",
    endDate: "2026-05-31",
    parentId: "fp-3",
    owner: "Монолит",
    budget: 2060000,
    paid: 0,
    plannedByPeriod: {
      "2026-05-w1": 420000,
      "2026-05-w2": 560000,
      "2026-05-w3": 520000,
      "2026-05-w4": 560000,
      "2026-05": 2060000,
    },
  },
  {
    id: "fp-3-2",
    name: "Перекрытия типовых этажей",
    startDate: "2026-05-12",
    endDate: "2026-06-15",
    parentId: "fp-3",
    owner: "Монолит",
    budget: 3260000,
    paid: 0,
    plannedByPeriod: {
      "2026-05-w2": 200000,
      "2026-05-w3": 410000,
      "2026-05-w4": 490000,
      "2026-06-w1": 1220000,
      "2026-06-w2": 940000,
      "2026-05": 1100000,
      "2026-06": 2160000,
    },
  },
  {
    id: "phase-3",
    name: "Инженерный контур",
    startDate: "2026-05-10",
    endDate: "2026-06-28",
    owner: "MEP",
    budget: 3180000,
    paid: 540000,
    plannedByPeriod: {
      "2026-05-w3": 280000,
      "2026-05-w4": 490000,
      "2026-06-w1": 760000,
      "2026-06-w2": 940000,
      "2026-06-w3": 710000,
      "2026-05": 770000,
      "2026-06": 2410000,
    },
  },
  {
    id: "fp-4",
    name: "Инженерия и MEP",
    startDate: "2026-05-10",
    endDate: "2026-06-28",
    parentId: "phase-3",
    owner: "Субподряд",
    budget: 3180000,
    paid: 540000,
    plannedByPeriod: {
      "2026-05-w3": 280000,
      "2026-05-w4": 490000,
      "2026-06-w1": 760000,
      "2026-06-w2": 940000,
      "2026-06-w3": 710000,
      "2026-05": 770000,
      "2026-06": 2410000,
    },
  },
  {
    id: "phase-4",
    name: "Отделка и сдача",
    startDate: "2026-06-08",
    endDate: "2026-06-30",
    owner: "Финиш",
    budget: 2400000,
    paid: 0,
    plannedByPeriod: {
      "2026-06-w2": 460000,
      "2026-06-w3": 850000,
      "2026-06-w4": 1090000,
      "2026-06": 2400000,
    },
  },
  {
    id: "fp-5",
    name: "Чистовая отделка",
    startDate: "2026-06-08",
    endDate: "2026-06-30",
    parentId: "phase-4",
    owner: "Финиш",
    budget: 2400000,
    paid: 0,
    plannedByPeriod: {
      "2026-06-w2": 460000,
      "2026-06-w3": 850000,
      "2026-06-w4": 1090000,
      "2026-06": 2400000,
    },
  },
  {
    id: "fp-5-1",
    name: "МОП и лестничные клетки",
    startDate: "2026-06-08",
    endDate: "2026-06-24",
    parentId: "fp-5",
    owner: "Финиш",
    budget: 1320000,
    paid: 0,
    plannedByPeriod: {
      "2026-06-w2": 460000,
      "2026-06-w3": 520000,
      "2026-06-w4": 340000,
      "2026-06": 1320000,
    },
  },
  {
    id: "fp-5-1-1",
    name: "Плитка и окраска МОП",
    startDate: "2026-06-08",
    endDate: "2026-06-24",
    parentId: "fp-5-1",
    owner: "Финиш",
    budget: 1320000,
    paid: 0,
    plannedByPeriod: {
      "2026-06-w2": 460000,
      "2026-06-w3": 520000,
      "2026-06-w4": 340000,
      "2026-06": 1320000,
    },
  },
  {
    id: "fp-5-2",
    name: "Пусконаладка и передача",
    startDate: "2026-06-22",
    endDate: "2026-06-30",
    parentId: "fp-5",
    owner: "Финиш",
    budget: 1080000,
    paid: 0,
    plannedByPeriod: {
      "2026-06-w3": 330000,
      "2026-06-w4": 750000,
      "2026-06": 1080000,
    },
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_COLUMN_WIDTH = 98;
const DAY_COLUMN_WIDTH = WEEK_COLUMN_WIDTH / 7;

function utcDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function startOfMondayWeek(date: Date) {
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

function formatWeekLabel(start: Date) {
  const end = addDays(start, 6);
  const startDay = String(start.getUTCDate()).padStart(2, "0");
  const endDay = String(end.getUTCDate()).padStart(2, "0");

  return `${startDay}-${endDay}`;
}

function getMonthId(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthHeader(date: Date, withYear = false) {
  const month = date.toLocaleString("ru-RU", { month: "long", timeZone: "UTC" });
  const label = month.charAt(0).toUpperCase() + month.slice(1);
  return withYear ? `${label} ${date.getUTCFullYear()}` : label;
}

function getWeekGroupMonthId(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  if (weekStart.getUTCMonth() === weekEnd.getUTCMonth()) {
    return getMonthId(weekStart);
  }

  const nextMonthDays = weekEnd.getUTCDate();
  return nextMonthDays > 3 ? getMonthId(weekEnd) : getMonthId(weekStart);
}

function buildMondayWeeksByMonthMajority(startMonth: Date, endMonth: Date): PeriodDefinition[] {
  const firstWeekStart = startOfMondayWeek(startMonth);
  const stopBefore = startOfMondayWeek(endMonth);
  const weekCounters = new Map<string, number>();
  const periods: PeriodDefinition[] = [];
  let cursor = firstWeekStart;

  while (cursor < stopBefore) {
    const groupId = getWeekGroupMonthId(cursor);
    const weekNumber = (weekCounters.get(groupId) ?? 0) + 1;
    weekCounters.set(groupId, weekNumber);
    periods.push({
      id: `${groupId}-w${weekNumber}`,
      label: formatWeekLabel(cursor),
      groupId,
      startDate: cursor,
      endDate: addDays(cursor, 6),
    });
    cursor = addDays(cursor, 7);
  }

  return periods;
}

const weeklyPeriods: PeriodDefinition[] = buildMondayWeeksByMonthMajority(
  utcDate(2026, 3, 1),
  utcDate(2026, 6, 1)
);

function buildMonthPeriods(startMonth: Date, endMonthExclusive: Date): PeriodDefinition[] {
  const periods: PeriodDefinition[] = [];
  let cursor = new Date(startMonth);

  while (cursor < endMonthExclusive) {
    const nextMonth = utcDate(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1);
    const id = getMonthId(cursor);
    periods.push({
      id,
      label: formatMonthHeader(cursor),
      groupId: String(cursor.getUTCFullYear()),
      startDate: cursor,
      endDate: addDays(nextMonth, -1),
    });
    cursor = nextMonth;
  }

  return periods;
}

const monthlyPeriods: PeriodDefinition[] = buildMonthPeriods(
  utcDate(2026, 7, 1),
  utcDate(2027, 11, 1)
);

function daysBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

function buildVisibleMonthGroups(startMonth: Date, endMonth: Date): TableMatrixColumnGroup[] {
  const visibleStart = startOfMondayWeek(startMonth);
  const visibleEnd = startOfMondayWeek(endMonth);
  const groups: TableMatrixColumnGroup[] = [];
  let cursor = new Date(startMonth);

  while (cursor < endMonth) {
    const nextMonth = utcDate(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1);
    const monthId = getMonthId(cursor);
    const start = groups.length === 0 ? visibleStart : cursor;
    const end = nextMonth >= endMonth ? visibleEnd : nextMonth;
    const header = monthGroupsById.get(monthId) ?? monthId;

    groups.push({
      id: monthId,
      header,
      width: daysBetween(start, end) * DAY_COLUMN_WIDTH,
    });

    cursor = nextMonth;
  }

  return groups;
}

const monthGroupsById = new Map([
  ["2026-04", "Апрель 2026"],
  ["2026-05", "Май 2026"],
  ["2026-06", "Июнь 2026"],
]);

const monthGroups: TableMatrixColumnGroup[] = buildVisibleMonthGroups(
  utcDate(2026, 3, 1),
  utcDate(2026, 6, 1)
);

function buildYearGroups(periods: PeriodDefinition[]): TableMatrixColumnGroup[] {
  const groups: TableMatrixColumnGroup[] = [];

  for (const period of periods) {
    const groupId = period.groupId;
    if (!groupId) continue;

    const width = getMatrixColumnSizing('month').minWidth ?? 104;
    const previousGroup = groups[groups.length - 1];
    if (previousGroup?.id === groupId) {
      previousGroup.width = (previousGroup.width ?? 0) + width;
      continue;
    }

    groups.push({
      id: groupId,
      header: groupId,
      width,
    });
  }

  return groups;
}

const yearGroups: TableMatrixColumnGroup[] = buildYearGroups(monthlyPeriods);

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value: number) {
  const formatted = moneyFormatter.format(value);
  return formatted.endsWith(",00") ? formatted.slice(0, -3) : formatted;
}

function MoneyValue({
  value,
  color,
  fontWeight,
}: {
  value: number;
  color?: string;
  fontWeight?: number;
}) {
  return (
    <span className="finance-money-value" style={{ color, fontWeight }}>
      {formatMoney(value)}
    </span>
  );
}

function getMatrixColumnSizing(view: MatrixView) {
  return view === 'week'
    ? { width: WEEK_COLUMN_WIDTH }
    : { width: 'auto' as const, minWidth: 104, maxWidth: 300 };
}

type BudgetEditorProps = {
  value: number;
  editStartValue?: string;
  onCommit: (value: number) => void;
  onCancel: () => void;
};

function BudgetCellEditor({ value, editStartValue, onCommit, onCancel }: BudgetEditorProps) {
  const [draft, setDraft] = useState(editStartValue ?? String(value));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (editStartValue === undefined) {
      inputRef.current?.select();
    } else {
      const cursorPosition = editStartValue.length;
      inputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [editStartValue]);

  const commit = () => {
    const nextValue = parseMoneyInput(draft);
    if (nextValue !== null) {
      onCommit(nextValue);
      return;
    }
    onCancel();
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      className="gantt-tl-inline-editor-input"
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
      }}
      style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
    />
  );
}

function parseMoneyInput(value: string): number | null {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function distributeBudgetAcrossLeafTasks(tasks: FinanceTask[], parentTaskId: string, nextBudget: number): FinanceTask[] {
  const childrenByParent = new Map<string, FinanceTask[]>();

  for (const task of tasks) {
    if (!task.parentId) continue;
    const siblings = childrenByParent.get(task.parentId) ?? [];
    siblings.push(task);
    childrenByParent.set(task.parentId, siblings);
  }

  const leafTasks: FinanceTask[] = [];
  const collectLeafTasks = (taskId: string) => {
    const children = childrenByParent.get(taskId) ?? [];
    if (children.length === 0) {
      const leafTask = tasks.find((task) => task.id === taskId);
      if (leafTask) leafTasks.push(leafTask);
      return;
    }
    for (const child of children) {
      collectLeafTasks(child.id);
    }
  };

  collectLeafTasks(parentTaskId);
  if (leafTasks.length === 0) {
    return tasks.map((task) => task.id === parentTaskId ? { ...task, budget: nextBudget } : task);
  }

  const currentTotal = leafTasks.reduce((sum, task) => sum + task.budget, 0);
  const equalShare = nextBudget / leafTasks.length;
  const redistributedBudgetById = new Map<string, number>();

  let assignedBudget = 0;
  leafTasks.forEach((task, index) => {
    const rawBudget = currentTotal > 0 ? (task.budget / currentTotal) * nextBudget : equalShare;
    const roundedBudget = index === leafTasks.length - 1
      ? Math.max(0, nextBudget - assignedBudget)
      : Math.max(0, Math.round(rawBudget));
    redistributedBudgetById.set(task.id, roundedBudget);
    assignedBudget += roundedBudget;
  });

  return tasks.map((task) => (
    redistributedBudgetById.has(task.id)
      ? { ...task, budget: redistributedBudgetById.get(task.id)! }
      : task
  ));
}

function deriveHierarchyFinanceTasks(tasks: FinanceTask[]): FinanceTask[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const childrenByParent = new Map<string, FinanceTask[]>();

  for (const task of tasks) {
    if (!task.parentId) continue;
    const siblings = childrenByParent.get(task.parentId) ?? [];
    siblings.push(task);
    childrenByParent.set(task.parentId, siblings);
  }

  const mergePeriods = (rows: FinanceTask[]) => {
    const merged: Record<string, number> = {};
    for (const row of rows) {
      for (const [periodId, value] of Object.entries(row.plannedByPeriod)) {
        merged[periodId] = (merged[periodId] ?? 0) + value;
      }
    }
    return merged;
  };

  const visit = (taskId: string): FinanceTask => {
    const task = byId.get(taskId)!;
    const children = childrenByParent.get(taskId) ?? [];
    if (children.length === 0) {
      return task;
    }

    const derivedChildren = children.map((child) => visit(child.id));
    return {
      ...task,
      budget: derivedChildren.reduce((sum, child) => sum + child.budget, 0),
      paid: derivedChildren.reduce((sum, child) => sum + child.paid, 0),
      plannedByPeriod: mergePeriods(derivedChildren),
    };
  };

  return tasks.map((task) => visit(task.id));
}

function buildTotalRow(tasks: FinanceTask[]): FinanceTask {
  const rootTasks = tasks.filter((task) => !task.parentId && !task.isTotal);
  const plannedByPeriod: Record<string, number> = {};

  for (const task of rootTasks) {
    for (const [periodId, value] of Object.entries(task.plannedByPeriod)) {
      plannedByPeriod[periodId] = (plannedByPeriod[periodId] ?? 0) + value;
    }
  }

  return {
    id: "finance-total",
    name: "ИТОГО",
    startDate: rootTasks[0]?.startDate ?? "2026-04-01",
    endDate: rootTasks[rootTasks.length - 1]?.endDate ?? "2026-06-30",
    owner: "Все контуры",
    budget: rootTasks.reduce((sum, task) => sum + task.budget, 0),
    paid: rootTasks.reduce((sum, task) => sum + task.paid, 0),
    plannedByPeriod,
    isTotal: true,
  };
}

function buildMatrixColumns(view: MatrixView): TableMatrixColumn<FinanceTask>[] {
  const periods = view === 'week' ? weeklyPeriods : monthlyPeriods;
  return periods.map((period) => ({
    id: period.id,
    header: period.label,
    groupId: period.groupId,
    periodStartDate: period.startDate,
    periodEndDate: period.endDate,
    ...getMatrixColumnSizing(view),
    cellClassName: (task) => task.plannedByPeriod[period.id] ? 'finance-matrix-cell-active' : 'finance-matrix-cell-empty',
    renderCell: (task) => {
      const value = task.plannedByPeriod[period.id] ?? 0;
      const share = value > 0 ? Math.round((value / Math.max(task.budget, 1)) * 100) : 0;
      const showSecondaryLine = value > 0 && share >= 18;
      return (
        <div style={{ display: 'grid', gap: 2, justifyItems: 'end', padding: '2px 0' }}>
          {value > 0 && (
            <MoneyValue value={value} color="#0f172a" />
          )}
          {showSecondaryLine && (
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {share}% бюджета
            </span>
          )}
        </div>
      );
    },
  }));
}

function getPeriodLabel(periodId: string) {
  return [...weeklyPeriods, ...monthlyPeriods].find((period) => period.id === periodId)?.label ?? periodId;
}

export default function FinancePlanMatrixDemo() {
  const [baseTasks, setBaseTasks] = useState<FinanceTask[]>(financeTasks);
  const [view, setView] = useState<MatrixView>('week');
  const [showShareLine, setShowShareLine] = useState(true);
  const [showDayFill, setShowDayFill] = useState(true);
  const [showProgressLine, setShowProgressLine] = useState(true);
  const [showProgressFill, setShowProgressFill] = useState(true);
  const [matrixCellModal, setMatrixCellModal] = useState<MatrixCellModalState>(null);
  const tasks = useMemo(() => deriveHierarchyFinanceTasks(baseTasks), [baseTasks]);
  const displayTasks = useMemo(() => [...tasks, buildTotalRow(tasks)], [tasks]);

  const additionalColumns = useMemo<TaskListColumn<FinanceTask>[]>(() => [
    {
      id: 'owner',
      header: 'Ответственный',
      width: 120,
      align: 'left',
      after: 'name',
      renderCell: ({ task }) => <span style={{ fontWeight: task.parentId && !task.isTotal ? 500 : 700 }}>{task.owner}</span>,
    },
    {
      id: 'budget',
      header: 'Бюджет',
      width: 120,
      align: 'right',
      after: 'owner',
      editable: true,
      renderCell: ({ task }) => (
        <MoneyValue value={task.budget} fontWeight={task.parentId && !task.isTotal ? 500 : 700} />
      ),
      renderEditor: ({ task, editStartValue, updateTask, closeEditor }) => {
        return (
          <BudgetCellEditor
            value={task.budget}
            editStartValue={editStartValue}
            onCommit={(nextValue) => updateTask({ budget: nextValue })}
            onCancel={closeEditor}
          />
        );
      },
    },
    {
      id: 'paid',
      header: 'Оплачено',
      width: 120,
      align: 'right',
      after: 'budget',
      renderCell: ({ task }) => (
        <MoneyValue
          value={task.paid}
          color={task.paid > 0 ? '#0f766e' : '#94a3b8'}
          fontWeight={task.parentId && !task.isTotal ? 500 : 700}
        />
      ),
    },
  ], []);

  const matrixColumns = useMemo(() => {
    const periods = view === 'week' ? weeklyPeriods : monthlyPeriods;

    return periods.map((period) => ({
      id: period.id,
      header: period.label,
      groupId: period.groupId,
      periodStartDate: period.startDate,
      periodEndDate: period.endDate,
      ...getMatrixColumnSizing(view),
      cellClassName: (task: FinanceTask) => [
        showDayFill && (task.plannedByPeriod[period.id] ? 'finance-matrix-cell-active' : 'finance-matrix-cell-empty'),
        task.isTotal ? 'finance-matrix-cell-total' : '',
      ].filter(Boolean).join(' '),
      renderCell: (task: FinanceTask) => {
        const value = task.plannedByPeriod[period.id] ?? 0;
        const share = value > 0 ? Math.round((value / Math.max(task.budget, 1)) * 100) : 0;
        const showSecondaryLine = showShareLine && value > 0 && share >= 18;

        return (
          <div style={{ display: 'grid', gap: 2, justifyItems: 'end', padding: '2px 0' }}>
            {value > 0 && (
              <MoneyValue value={value} color="#0f172a" fontWeight={task.isTotal ? 700 : undefined} />
            )}
            {showSecondaryLine && (
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {share}% бюджета
              </span>
            )}
          </div>
        );
      },
    }));
  }, [showDayFill, showShareLine, view]);

  const matrixDateOverlay = useMemo(() => {
    if (!showProgressLine && !showProgressFill) return false;

    return {
      date: "2026-05-04",
      edgeColor: showProgressLine ? undefined : 'transparent',
      shouldRender: ({ task, column }: { task: FinanceTask; column: TableMatrixColumn<FinanceTask> }) => (
        showProgressFill && (task.plannedByPeriod[column.id] ?? 0) > 0
      ),
    };
  }, [showProgressFill, showProgressLine]);

  return (
    <section className="demo-section finance-matrix-demo">
      <h2 className="demo-section-title">Table Matrix Financial Plan</h2>
      <p className="demo-section-desc">
        Слева обычный <code>TaskList</code> с иерархией фаз и статей, справа произвольная матрица ячеек. В этом примере строки в режиме <code>table-matrix</code> автоматически ужимаются по контенту: где есть только сумма, строка ниже, где появляется вторая строка, высота увеличивается ровно под содержимое.
      </p>
      <div className="demo-controls">
        <button
          type="button"
          className={`demo-btn ${view === 'week' ? 'demo-btn-primary' : 'demo-btn-neutral'}`}
          onClick={() => setView('week')}
        >
          По неделям
        </button>
        <button
          type="button"
          className={`demo-btn ${view === 'month' ? 'demo-btn-primary' : 'demo-btn-neutral'}`}
          onClick={() => setView('month')}
        >
          По месяцам
        </button>
        <button
          type="button"
          className={`demo-btn ${showShareLine ? 'demo-btn-primary' : 'demo-btn-neutral'}`}
          onClick={() => setShowShareLine((current) => !current)}
        >
          {showShareLine ? 'Скрыть % строку' : 'Показать % строку'}
        </button>
        <button
          type="button"
          className={`demo-btn ${showDayFill ? 'demo-btn-primary' : 'demo-btn-neutral'}`}
          onClick={() => setShowDayFill((current) => !current)}
        >
          {showDayFill ? 'Скрыть заливку дней' : 'Показать заливку дней'}
        </button>
        <button
          type="button"
          className={`demo-btn ${showProgressLine ? 'demo-btn-primary' : 'demo-btn-neutral'}`}
          onClick={() => setShowProgressLine((current) => !current)}
        >
          {showProgressLine ? 'Скрыть полосу прогресса' : 'Показать полосу прогресса'}
        </button>
        <button
          type="button"
          className={`demo-btn ${showProgressFill ? 'demo-btn-primary' : 'demo-btn-neutral'}`}
          onClick={() => setShowProgressFill((current) => !current)}
        >
          {showProgressFill ? 'Скрыть заливку прогресса' : 'Показать заливку прогресса'}
        </button>
        <span className="demo-hint">Корневые строки показывают агрегат по фазе, дочерние строки раскрывают детализацию по статьям.</span>
      </div>
      <div className="demo-chart-card">
        <GanttChart<FinanceTask>
          mode="table-matrix"
          tasks={displayTasks}
          showTaskList={true}
          taskListWidth={620}
          rowHeight={36}
          rowContentLines={showShareLine ? 2 : 1}
          headerHeight={52}
          containerHeight={640}
          matrixColumns={matrixColumns}
          matrixColumnGroups={view === 'week' ? monthGroups : yearGroups}
          matrixDateOverlay={matrixDateOverlay}
          additionalColumns={additionalColumns}
          hiddenTaskListColumns={['dependencies', 'progress', 'duration', 'startDate', 'endDate']}
          disableDependencyEditing={true}
          disableTaskNameEditing={true}
          disableTaskDrag={true}
          enableAddTask={false}
          hideTaskListRowActions={true}
          onMatrixCellClick={({ task, column }) => {
            setMatrixCellModal({
              taskName: task.name,
              periodLabel: getPeriodLabel(column.id),
              value: task.plannedByPeriod[column.id] ?? 0,
            });
          }}
          onTasksChange={(changedTasks) => {
            setBaseTasks((current) => {
              let nextTasks = current;

              for (const changedTask of changedTasks) {
                const sourceTask = current.find((task) => task.id === changedTask.id);
                if (!sourceTask) continue;

                const hasChildren = current.some((task) => task.parentId === changedTask.id);
                if (hasChildren && typeof changedTask.budget === 'number' && changedTask.budget !== sourceTask.budget) {
                  nextTasks = distributeBudgetAcrossLeafTasks(nextTasks, changedTask.id, changedTask.budget);
                  continue;
                }

                nextTasks = nextTasks.map((task) => (
                  task.id === changedTask.id ? { ...task, ...changedTask } : task
                ));
              }

              return nextTasks;
            });
          }}
        />
      </div>
      {matrixCellModal && (
        <div className="finance-cell-modal-backdrop" onClick={() => setMatrixCellModal(null)}>
          <div
            className="finance-cell-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="finance-cell-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h3 id="finance-cell-modal-title">Сумма ячейки</h3>
              <p>{matrixCellModal.taskName}</p>
            </div>
            <dl>
              <div>
                <dt>Период</dt>
                <dd>{matrixCellModal.periodLabel}</dd>
              </div>
              <div>
                <dt>Сумма</dt>
                <dd>{formatMoney(matrixCellModal.value)}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="demo-btn demo-btn-neutral"
              onClick={() => setMatrixCellModal(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

# Критический путь (criticalPathMode) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить пропс `criticalPathMode?: 'highlight' | 'hide'` в классический gantt-режим: библиотека сама вычисляет критический путь (CPM по FS-связям), подсвечивает критические барры и линии-зависимости или скрывает некритичные задачи.

**Architecture:** Новый чистый модуль `core/scheduling/criticalPath.ts` с функциями `computeCriticalPath` (возвращает критичные id листовых задач) и `extendCriticalIdsToParents` (подъём критичности по `parentId`). Интеграция в `GanttChart` (мемоизированный `criticalTaskIds`, фильтрация `visibleTasks` при `'hide'`), `TaskRow` (цвет барра через `isCritical`), `DependencyLines` (класс `.gantt-dependency-critical` при двух критичных концах). Пропс живёт только в `GanttModeProps` и читается через сужение union по `mode` (дискриминант `'gantt'`).

**Tech Stack:** TypeScript, React 19, Vitest 3, jsdom. Runtime-agnostic core (zero React/DOM/date-fns в `core/scheduling`).

## Global Constraints

- Пропс только в `GanttModeProps` (не в `TaskChartSharedProps`); в table-matrix/plan-fact/resource-planner игнорируется (TS не даёт передать).
- Расчёт только по FS-связям (`type === 'FS'`) с лагами; SS/FF/SF игнорируются.
- Длительность задачи — в рабочих днях (`getTaskDuration` с `businessDays`/`weekendPredicate`); лаг — календарный (`getDependencyLag`).
- Граф строится только из листовых задач (нет ни одной задачи с `parentId === task.id`); milestone — обычный лист.
- Критична задача при `float === 0` И наличии хотя бы одной FS-связи (входящей или исходящей). Изолированные задачи не критичны.
- Циклы не зависают: топологическая сортировка (Kahn) с пропуском вершин, не вошедших в порядок.
- Приоритет цвета барра: `isExpired` > `isCritical` > `task.color`.
- Приоритет стилей линий: selected > cycle > critical.
- `--gantt-critical-path-color` со значением по умолчанию `#dc2626`.
- Все команды тестов запускать в `packages/gantt-lib`.

---

### Task 1: Модуль `core/scheduling/criticalPath.ts` + unit-тесты

**Files:**
- Create: `src/core/scheduling/criticalPath.ts`
- Create: `src/core/scheduling/__tests__/criticalPath.test.ts`
- Modify: `src/core/scheduling/index.ts` (добавить `export * from './criticalPath';`)
- Modify: `src/utils/dependencyUtils.ts` (backward-compat реэкспорт)

**Interfaces:**
- Produces:
  - `interface CriticalPathOptions { businessDays?: boolean; weekendPredicate?: (date: Date) => boolean }`
  - `computeCriticalPath(tasks: ScheduleTask[], options?: CriticalPathOptions): Set<string>`
  - `extendCriticalIdsToParents(criticalLeafIds: Set<string>, tasks: ScheduleTask[]): Set<string>`

- [ ] **Step 1: Написать тест `src/core/scheduling/__tests__/criticalPath.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { computeCriticalPath, extendCriticalIdsToParents } from '../criticalPath';
import type { ScheduleTask } from '../types';

const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

function makeTask(partial: { id: string; startDate: string; endDate: string; dependencies?: ScheduleTask['dependencies']; parentId?: string }): ScheduleTask {
  return { ...partial };
}

describe('computeCriticalPath', () => {
  it('marks all tasks of a single linear FS chain as critical', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }] }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'B', 'C']));
  });

  it('marks only the longest parallel branch as critical', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B1', startDate: '2026-01-08', endDate: '2026-01-09', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'B2', startDate: '2026-01-08', endDate: '2026-01-12', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-13', endDate: '2026-01-15', dependencies: [{ taskId: 'B1', type: 'FS', lag: 0 }, { taskId: 'B2', type: 'FS', lag: 0 }] }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'B2', 'C']));
  });

  it('marks all equally-long parallel branches as critical', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B1', startDate: '2026-01-08', endDate: '2026-01-09', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'B2', startDate: '2026-01-08', endDate: '2026-01-09', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-10', endDate: '2026-01-12', dependencies: [{ taskId: 'B1', type: 'FS', lag: 0 }, { taskId: 'B2', type: 'FS', lag: 0 }] }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'B1', 'B2', 'C']));
  });

  it('accounts for a positive FS lag lengthening the path', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 2 }] }),
      makeTask({ id: 'B2', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }, { taskId: 'B2', type: 'FS', lag: 0 }] }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'B', 'C']));
  });

  it('treats a milestone (single-day leaf) as a regular leaf in the path', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'M', startDate: '2026-01-08', endDate: '2026-01-08', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'M']));
  });

  it('does not mark isolated tasks (no FS edges) as critical', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10' }),
    ];
    expect(computeCriticalPath(tasks)).toEqual(new Set());
  });

  it('does not hang on a cycle and returns no critical tasks from it', () => {
    const tasks = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
    ];
    expect(() => computeCriticalPath(tasks)).not.toThrow();
    expect(computeCriticalPath(tasks)).toEqual(new Set());
  });

  it('excludes parent tasks (tasks that have children) from the graph', () => {
    const tasks = [
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-12' }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07', parentId: 'P' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', parentId: 'P', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
    ];
    const result = computeCriticalPath(tasks);
    expect(result.has('P')).toBe(false);
    expect(result).toEqual(new Set(['A', 'B']));
  });

  it('uses business days for task weight when businessDays=true', () => {
    const tasks = [
      // A: Mon..Sun = 7 calendar days, 5 business days
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-11' }),
      // B: Mon..Fri = 5 calendar days, 5 business days
      makeTask({ id: 'B', startDate: '2026-01-05', endDate: '2026-01-09' }),
      makeTask({ id: 'C', startDate: '2026-01-12', endDate: '2026-01-14', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }, { taskId: 'B', type: 'FS', lag: 0 }] }),
    ];
    // With business days both branches weigh 5 => both critical.
    expect(computeCriticalPath(tasks, { businessDays: true, weekendPredicate: isWeekend })).toEqual(new Set(['A', 'B', 'C']));
    // With calendar days branch A weighs 7 > 5 => only A and C critical.
    expect(computeCriticalPath(tasks)).toEqual(new Set(['A', 'C']));
  });
});

describe('extendCriticalIdsToParents', () => {
  it('lifts criticality up the parent chain', () => {
    const tasks = [
      makeTask({ id: 'G', startDate: '2026-01-05', endDate: '2026-01-14' }),
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-12', parentId: 'G' }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07', parentId: 'P' }),
      makeTask({ id: 'Q', startDate: '2026-01-08', endDate: '2026-01-10' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', parentId: 'Q' }),
    ];
    expect(extendCriticalIdsToParents(new Set(['A']), tasks)).toEqual(new Set(['A', 'P', 'G']));
  });
});
```

- [ ] **Step 2: Запустить тест, убедиться что он падает (модуль не существует)**

Run: `npx vitest run src/core/scheduling/__tests__/criticalPath.test.ts`
Expected: FAIL — cannot resolve `../criticalPath`.

- [ ] **Step 3: Написать `src/core/scheduling/criticalPath.ts`**

```ts
/**
 * Critical path (CPM) calculation over FS dependency links.
 * Zero React/DOM/date-fns imports.
 *
 * Semantics:
 * - Only leaf tasks (no task references them as parentId) participate in the graph.
 * - Only FS links with calendar lags are edges; SS/FF/SF are ignored.
 * - Task weight = business-day duration (getTaskDuration); edge weight = calendar lag.
 * - Task is critical when its float (LS - ES) is exactly 0 AND it has at least one
 *   FS edge (incoming or outgoing). Isolated tasks are never critical.
 * - Cycles are skipped by topological ordering (Kahn) — cyclic tasks are not critical.
 */

import type { ScheduleTask } from './types';
import { getTaskDuration } from './dateMath';
import { getDependencyLag } from './dependencies';

export interface CriticalPathOptions {
  businessDays?: boolean;
  weekendPredicate?: (date: Date) => boolean;
}

export function computeCriticalPath(
  tasks: ScheduleTask[],
  options: CriticalPathOptions = {}
): Set<string> {
  const { businessDays = false, weekendPredicate } = options;

  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const childIds = new Set<string>();
  for (const task of tasks) {
    if (task.parentId) childIds.add(task.parentId);
  }
  const leafTasks = tasks.filter((task) => !childIds.has(task.id));
  const leafIds = new Set(leafTasks.map((task) => task.id));

  const durationOf = (task: ScheduleTask): number =>
    getTaskDuration(task.startDate, task.endDate, businessDays, weekendPredicate);

  // FS-only adjacency: predecessor -> successors, successor -> predecessors.
  const succByPred = new Map<string, Array<{ succId: string; lag: number }>>();
  const predBySucc = new Map<string, Array<{ predId: string; lag: number }>>();

  for (const succ of leafTasks) {
    for (const dep of succ.dependencies ?? []) {
      if (dep.type !== 'FS') continue;
      if (!leafIds.has(dep.taskId)) continue;
      const lag = getDependencyLag(dep);

      const outEdges = succByPred.get(dep.taskId) ?? [];
      outEdges.push({ succId: succ.id, lag });
      succByPred.set(dep.taskId, outEdges);

      const inEdges = predBySucc.get(succ.id) ?? [];
      inEdges.push({ predId: dep.taskId, lag });
      predBySucc.set(succ.id, inEdges);
    }
  }

  // Topological order (Kahn). Vertices trapped in cycles never enter the order
  // (indegree never drops to 0) and are therefore excluded from criticality.
  const indegree = new Map<string, number>();
  for (const leaf of leafTasks) indegree.set(leaf.id, 0);
  for (const edges of succByPred.values()) {
    for (const { succId } of edges) {
      indegree.set(succId, (indegree.get(succId) ?? 0) + 1);
    }
  }

  const order: string[] = [];
  const enqueued = new Set<string>();
  const queue = leafTasks
    .filter((leaf) => (indegree.get(leaf.id) ?? 0) === 0)
    .map((leaf) => leaf.id);
  for (const id of queue) enqueued.add(id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const { succId } of succByPred.get(current) ?? []) {
      const next = (indegree.get(succId) ?? 0) - 1;
      indegree.set(succId, next);
      if (next === 0 && !enqueued.has(succId)) {
        enqueued.add(succId);
        queue.push(succId);
      }
    }
  }

  // Forward pass: early start / early finish on the abstract day scale.
  const ES = new Map<string, number>();
  const EF = new Map<string, number>();
  for (const leaf of leafTasks) ES.set(leaf.id, 0);

  for (const id of order) {
    const task = taskById.get(id)!;
    let es = 0;
    for (const { predId, lag } of predBySucc.get(id) ?? []) {
      const candidate = (ES.get(predId) ?? 0) + durationOf(taskById.get(predId)!) + lag;
      if (candidate > es) es = candidate;
    }
    ES.set(id, es);
    EF.set(id, es + durationOf(task));
  }

  const projectFinish = Math.max(0, ...leafTasks.map((leaf) => EF.get(leaf.id) ?? 0));

  // Backward pass: late finish / late start.
  const LF = new Map<string, number>();
  const LS = new Map<string, number>();
  for (const leaf of leafTasks) LF.set(leaf.id, projectFinish);

  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const task = taskById.get(id)!;
    const outEdges = succByPred.get(id) ?? [];
    let lf = projectFinish;
    if (outEdges.length > 0) {
      lf = Math.min(...outEdges.map(({ succId, lag }) => (LS.get(succId) ?? projectFinish) - lag));
    }
    LF.set(id, lf);
    LS.set(id, lf - durationOf(task));
  }

  const critical = new Set<string>();
  for (const leaf of leafTasks) {
    const hasEdge =
      (succByPred.get(leaf.id)?.length ?? 0) > 0 ||
      (predBySucc.get(leaf.id)?.length ?? 0) > 0;
    if (!hasEdge) continue;
    const es = ES.get(leaf.id) ?? 0;
    const ls = LS.get(leaf.id) ?? 0;
    if (ls - es === 0) critical.add(leaf.id);
  }

  return critical;
}

/**
 * Extend criticality from leaf ids upward through the parent chain.
 * A parent is critical when any of its descendants is critical.
 */
export function extendCriticalIdsToParents(
  criticalLeafIds: Set<string>,
  tasks: ScheduleTask[]
): Set<string> {
  const result = new Set(criticalLeafIds);
  const parentByChild = new Map<string, string>();
  for (const task of tasks) {
    if (task.parentId) parentByChild.set(task.id, task.parentId);
  }

  const stack = Array.from(criticalLeafIds);
  while (stack.length > 0) {
    const id = stack.pop()!;
    const parentId = parentByChild.get(id);
    if (parentId && !result.has(parentId)) {
      result.add(parentId);
      stack.push(parentId);
    }
  }

  return result;
}
```

- [ ] **Step 4: Добавить экспорт в `src/core/scheduling/index.ts`**

Добавить строку после `export * from './dependencies';`:

```ts
export * from './criticalPath';
```

- [ ] **Step 5: Добавить backward-compat реэкспорт в `src/utils/dependencyUtils.ts`**

В блок re-export (после секции `// cascade`) добавить:

```ts
  // critical path
  computeCriticalPath,
  extendCriticalIdsToParents,
```

и в блок типов — после `type ScheduleTask,` нет; в существующий блок типов добавить:

```ts
  type CriticalPathOptions,
```

Точная правка: в `src/utils/dependencyUtils.ts` в секцию типов (строки 6–12) добавить `type CriticalPathOptions,`, а в секцию функций (после строки 36, перед `// commands`) добавить строки экспорта. Импорт типа: `CriticalPathOptions` реэкспортируется через `export { type CriticalPathOptions } from '../core/scheduling'`. Так как файл использует единый `export { ... } from '../core/scheduling'`, оба добавления делаются внутрь этого существующего блока.

- [ ] **Step 6: Запустить тесты, убедиться что проходят**

Run: `npx vitest run src/core/scheduling/__tests__/criticalPath.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 7: Commit**

```bash
git add src/core/scheduling/criticalPath.ts src/core/scheduling/__tests__/criticalPath.test.ts src/core/scheduling/index.ts src/utils/dependencyUtils.ts
git commit -m "feat: расчёт критического пути (computeCriticalPath + extendCriticalIdsToParents)"
```

---

### Task 2: CSS-переменная, пропс и интеграция в GanttChart

**Files:**
- Modify: `src/styles.css` (`--gantt-critical-path-color`)
- Modify: `src/components/GanttChart/GanttChart.tsx`
- Modify: `src/components/DependencyLines/DependencyLines.css` (класс `.gantt-dependency-critical`)

**Interfaces:**
- Consumes: `computeCriticalPath`, `extendCriticalIdsToParents` из `../../core/scheduling`
- Produces:
  - Пропс `criticalPathMode?: 'highlight' | 'hide'` в `GanttModeProps`
  - `isCritical: boolean` для `TaskRow`
  - `criticalTaskIds?: Set<string>` для `DependencyLines`

- [ ] **Step 1: Добавить CSS-переменную в `src/styles.css`**

В блок `:root` после строки с `--gantt-expired-color: #ef4444;` добавить:

```css
  /* Critical path color */
  --gantt-critical-path-color: #dc2626;
```

- [ ] **Step 2: Добавить класс критической линии в `src/components/DependencyLines/DependencyLines.css`**

После блока `.gantt-dependency-selected` (строка ~54) добавить:

```css
/* Critical path dependency highlighting */
.gantt-dependency-critical {
  stroke: var(--gantt-critical-path-color, #dc2626);
  stroke-width: 2;
}
```

- [ ] **Step 3: Добавить пропс в `GanttModeProps`**

В `src/components/GanttChart/GanttChart.tsx`, в интерфейс `GanttModeProps` (после `businessDays?: boolean;` на строке ~445):

```ts
  /** Highlight critical path tasks (bars and dependency lines) or hide non-critical tasks (default: off) */
  criticalPathMode?: 'highlight' | 'hide';
```

- [ ] **Step 4: Импортировать функции в GanttChart**

В строке ~6 заменить импорт из `'../../core/scheduling'`, добавив два имени:

```ts
import {
  validateDependencies,
  cascadeByLinks,
  universalCascade,
  computeParentDates,
  computeParentProgress,
  getChildren,
  removeDependenciesBetweenTasks,
  isTaskParent,
  areTasksHierarchicallyRelated,
  calculateSuccessorDate,
  buildTaskRangeFromEnd,
  buildTaskRangeFromStart,
  getTaskDuration,
  computeCriticalPath,
  extendCriticalIdsToParents,
} from '../../core/scheduling';
```

- [ ] **Step 5: Прочитать пропс через сужение union**

В теле `TaskGanttChartInner`, рядом со строкой `const dayWidth = ...` (строка ~634) добавить:

```ts
  const criticalPathMode = !isTableMatrixMode && !isPlanFactMode ? props.criticalPathMode : undefined;
```

Проверено: TS сужает union по дискриминанту `mode`; после `!isTableMatrixMode && !isPlanFactMode` остаётся только `GanttModeProps`, где пропс существует.

- [ ] **Step 6: Мемоизировать `criticalTaskIds`**

После `isCustomWeekend` useMemo (строка ~893) и ПЕРЕД `visibleTasks` useMemo (строка ~943) вставить:

```ts
  // Critical path task ids (leaves via CPM + parents lifted up the chain).
  const criticalTaskIds = useMemo(() => {
    if (!criticalPathMode) return new Set<string>();
    const leafCritical = computeCriticalPath(normalizedTasks, {
      businessDays,
      weekendPredicate: isCustomWeekend,
    });
    return extendCriticalIdsToParents(leafCritical, normalizedTasks);
  }, [criticalPathMode, normalizedTasks, businessDays, isCustomWeekend]);
```

- [ ] **Step 7: Фильтровать `visibleTasks` при `'hide'`**

В `visibleTasks` useMemo (строка ~958), после блока `if (filterMode === 'hide' && taskFilter)`, добавить:

```ts
    // In 'hide' mode with critical path active, show only critical tasks (ancestors included).
    if (criticalPathMode === 'hide') {
      tasks = tasks.filter(task => criticalTaskIds.has(task.id));
    }
```

И заменить массив зависимостей на строке ~963:

```ts
  }, [normalizedTasks, collapsedParentIds, filterMode, taskFilter, criticalPathMode, criticalTaskIds]);
```

- [ ] **Step 8: Передать `isCritical` в TaskRow**

В строке ~2273 (рядом с `isFilterMatch`) добавить в `<TaskRow ...>`:

```tsx
                        isCritical={criticalTaskIds.has(task.id)}
```

- [ ] **Step 9: Передать `criticalTaskIds` в DependencyLines**

В `<DependencyLines ...>` (строка ~2160), рядом с `onDependencyClick`, добавить:

```tsx
                    criticalTaskIds={criticalPathMode ? criticalTaskIds : undefined}
```

- [ ] **Step 10: Проверить компиляцию GanttChart.tsx**

Run: `npx tsc --noEmit --strict --jsx react-jsx --module esnext --moduleResolution bundler --target es2022 --skipLibCheck src/components/GanttChart/GanttChart.tsx`
Expected: EXIT 0, без ошибок. (Существующие ошибки только в `__tests__`, не в src.)

- [ ] **Step 11: Commit**

```bash
git add src/styles.css src/components/DependencyLines/DependencyLines.css src/components/GanttChart/GanttChart.tsx
git commit -m "feat: пропс criticalPathMode и расчёт criticalTaskIds в GanttChart"
```

---

### Task 3: TaskRow — цвет барра критической задачи

**Files:**
- Modify: `src/components/TaskRow/TaskRow.tsx`
- Create: `src/__tests__/criticalTaskRow.test.tsx`

**Interfaces:**
- Consumes: пропс `isCritical?: boolean` (передаётся из GanttChart)
- Produces: `isCritical?: boolean` в `TaskRowProps`; класс барра критической задачи красится в `--gantt-critical-path-color`

- [ ] **Step 1: Написать тест `src/__tests__/criticalTaskRow.test.tsx`**

```tsx
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import TaskRow from '../components/TaskRow';
import type { Task } from '../components/GanttChart';

function makeTask(partial: Partial<Task> & { id: string; startDate: string; endDate: string }): Task {
  return { name: partial.id, ...partial } as Task;
}

function getBar(container: HTMLElement) {
  return container.querySelector('[data-taskbar]') as HTMLElement;
}

describe('TaskRow critical path bar color', () => {
  it('paints the bar with the critical path color when isCritical is true', () => {
    const task = makeTask({ id: 'A', startDate: '2026-02-02', endDate: '2026-02-04' });
    const { container } = render(
      <TaskRow
        task={task}
        monthStart={new Date(Date.UTC(2026, 1, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[task]}
        onTasksChange={vi.fn()}
        isCritical
      />
    );
    expect(getBar(container).style.backgroundColor).toBe('var(--gantt-critical-path-color, #dc2626)');
  });

  it('keeps task.color when isCritical is false', () => {
    const task = makeTask({ id: 'A', startDate: '2026-02-02', endDate: '2026-02-04', color: '#123456' });
    const { container } = render(
      <TaskRow
        task={task}
        monthStart={new Date(Date.UTC(2026, 1, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[task]}
        onTasksChange={vi.fn()}
        isCritical={false}
      />
    );
    expect(getBar(container).style.backgroundColor).toBe('#123456');
  });

  it('prioritizes expired over critical', () => {
    const task = makeTask({ id: 'E', startDate: '2026-01-05', endDate: '2026-01-09', progress: 0 });
    const { container } = render(
      <TaskRow
        task={task}
        monthStart={new Date(Date.UTC(2026, 0, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[task]}
        onTasksChange={vi.fn()}
        isCritical
        highlightExpiredTasks
      />
    );
    expect(getBar(container).style.backgroundColor).toBe('var(--gantt-expired-color)');
  });

  it('adds the critical color to a parent bar', () => {
    const parent = makeTask({ id: 'P', startDate: '2026-02-02', endDate: '2026-02-08' });
    const child = makeTask({ id: 'A', startDate: '2026-02-02', endDate: '2026-02-04', parentId: 'P' });
    const { container } = render(
      <TaskRow
        task={parent}
        monthStart={new Date(Date.UTC(2026, 1, 1))}
        dayWidth={40}
        rowHeight={40}
        allTasks={[parent, child]}
        onTasksChange={vi.fn()}
        isCritical
      />
    );
    expect(getBar(container).style.getPropertyValue('--gantt-parent-bar-color')).toBe('var(--gantt-critical-path-color, #dc2626)');
  });
});
```

Примечание к тесту expired: `isTaskExpired` использует `new Date()` как reference date. Задача `E` (05.01–09.01, progress 0) проходила бы проверку только если текущая дата позже 05.01. Чтобы тест был детерминированным, замо́каем Date (паттерн из `expiredFilter.test.ts`):

```tsx
import { afterEach, beforeEach } from 'vitest';

let originalDate: DateConstructor;
beforeEach(() => {
  originalDate = global.Date;
  const mockToday = new Date(Date.UTC(2026, 1, 15, 12, 0, 0));
  // @ts-expect-error test Date mock
  global.Date = class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) super(mockToday);
      // @ts-expect-error pass-through
      else super(...args);
    }
    static now() {
      return mockToday.getTime();
    }
  };
});
afterEach(() => {
  global.Date = originalDate;
});
```

И в задаче для expired-теста использовать даты, которые однозначно просрочены при mock 2026-02-15: `startDate: '2026-01-05', endDate: '2026-01-09'` уже подходит (elapsedFromToday > 0, expectedProgress > 0, actualProgress 0 < expectedProgress).

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/__tests__/criticalTaskRow.test.tsx`
Expected: FAIL — первые 2 теста не пройдут (нет пропса `isCritical` / нет критического цвета).

- [ ] **Step 3: Добавить пропс и логику в `src/components/TaskRow/TaskRow.tsx`**

3a. В `TaskRowProps` (после `highlightExpiredTasks` на строке ~54) добавить:

```ts
  /** Whether this task lies on the critical path */
  isCritical?: boolean;
```

3b. В `arePropsEqual` (после строки `prevProps.highlightExpiredTasks === nextProps.highlightExpiredTasks`) добавить:

```ts
    prevProps.isCritical === nextProps.isCritical &&
```

3c. В деструктуризации компонента (строка ~145) после `highlightExpiredTasks,` добавить:

```ts
    isCritical = false,
```

3d. В `barColor` (строки 199–201) добавить ветку critical:

```ts
    const barColor = isExpired
      ? 'var(--gantt-expired-color)'
      : isCritical
        ? 'var(--gantt-critical-path-color, #dc2626)'
        : (task.color || 'var(--gantt-task-bar-default-color)');
```

3e. В `progressColor` (строки 210–223) заменить `const baseColor = task.color || 'var(--gantt-task-bar-default-color)';` на:

```ts
      const baseColor = isCritical
        ? 'var(--gantt-critical-path-color, #dc2626)'
        : (task.color || 'var(--gantt-task-bar-default-color)');
```

и добавить `isCritical` в массив зависимостей useMemo: `[isExpired, isCritical, progressWidth, task.accepted, task.color]`.

3f. В `externalTaskNameColor` (строки 225–233) заменить блок выбора baseColor на:

```ts
      const baseColor = isCritical
        ? 'var(--gantt-critical-path-color, #dc2626)'
        : isParent
          ? (task.color || defaultParentBarColor)
          : (task.color || 'var(--gantt-task-bar-default-color)');
```

и добавить `isCritical` в зависимости: `[defaultParentBarColor, isExpired, isCritical, isParent, task.color]`.

3g. В `barStyle` (строки 236–251) заменить `const parentBarColor = task.color || defaultParentBarColor;` на:

```ts
      const parentBarColor = isCritical
        ? 'var(--gantt-critical-path-color, #dc2626)'
        : (task.color || defaultParentBarColor);
```

и добавить `isCritical` в зависимости: `[defaultParentBarColor, isExpired, isCritical, isParent, progressWidth, barColor, progressColor, task.color]`.

- [ ] **Step 4: Запустить тесты, убедиться что проходят**

Run: `npx vitest run src/__tests__/criticalTaskRow.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/TaskRow/TaskRow.tsx src/__tests__/criticalTaskRow.test.tsx
git commit -m "feat: подсветка критического пути цветом барра (TaskRow isCritical)"
```

---

### Task 4: DependencyLines — подсветка критических связей

**Files:**
- Modify: `src/components/DependencyLines/DependencyLines.tsx`
- Create: `src/__tests__/criticalDependencyLines.test.tsx`

**Interfaces:**
- Consumes: `criticalTaskIds?: Set<string>` (передаётся из GanttChart)
- Produces: линия с классом `.gantt-dependency-critical` и marker `arrowhead-critical`, когда оба конца критичны

- [ ] **Step 1: Написать тест `src/__tests__/criticalDependencyLines.test.tsx`**

```tsx
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DependencyLines } from '../components/DependencyLines';
import type { Task } from '../components/GanttChart';

function makeTask(partial: Partial<Task> & { id: string; startDate: string; endDate: string; dependencies?: Task['dependencies'] }): Task {
  return { name: partial.id, ...partial } as Task;
}

const monthStart = new Date(Date.UTC(2026, 1, 1));

function renderLines(tasks: Task[], allTasks: Task[], criticalTaskIds?: Set<string>) {
  return render(
    <DependencyLines
      tasks={tasks}
      allTasks={allTasks}
      monthStart={monthStart}
      dayWidth={40}
      rowHeight={40}
      gridWidth={400}
      rowIndexByTaskId={new Map(tasks.map((t, i) => [t.id, i]))}
      criticalTaskIds={criticalTaskIds}
    />
  );
}

describe('DependencyLines critical path highlighting', () => {
  it('adds the critical class when both ends are critical', () => {
    const a = makeTask({ id: 'A', startDate: '2026-02-02', endDate: '2026-02-04' });
    const b = makeTask({
      id: 'B',
      startDate: '2026-02-05',
      endDate: '2026-02-07',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
    });
    const { container } = renderLines([a, b], [a, b], new Set(['A', 'B']));

    const criticalLines = container.querySelectorAll('.gantt-dependency-critical');
    expect(criticalLines.length).toBe(1);
  });

  it('keeps default styling when criticalTaskIds is empty or not provided', () => {
    const a = makeTask({ id: 'A', startDate: '2026-02-02', endDate: '2026-02-04' });
    const b = makeTask({
      id: 'B',
      startDate: '2026-02-05',
      endDate: '2026-02-07',
      dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }],
    });
    const { container, rerender } = renderLines([a, b], [a, b], undefined);
    expect(container.querySelectorAll('.gantt-dependency-critical').length).toBe(0);

    rerender(
      <DependencyLines
        tasks={[a, b]}
        allTasks={[a, b]}
        monthStart={monthStart}
        dayWidth={40}
        rowHeight={40}
        gridWidth={400}
        rowIndexByTaskId={new Map([[a.id, 0], [b.id, 1]])}
        criticalTaskIds={new Set(['A'])}
      />
    );
    expect(container.querySelectorAll('.gantt-dependency-critical').length).toBe(0);
  });
});
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/__tests__/criticalDependencyLines.test.tsx`
Expected: FAIL — `.gantt-dependency-critical` не появляется (пропс ещё не обрабатывается).

- [ ] **Step 3: Добавить поддержку в `src/components/DependencyLines/DependencyLines.tsx`**

3a. В `DependencyLinesProps` (после `selectedDep` на строке ~93) добавить:

```ts
  /** Ids of tasks on the critical path. Lines with both ends critical are highlighted. */
  criticalTaskIds?: Set<string>;
```

3b. В деструктуризации компонента (строка ~119) после `selectedDep,` добавить:

```ts
  criticalTaskIds,
```

3c. В типе элемента массива `lines` (строки 240–253) добавить поле `isCritical: boolean;`:

```ts
    const lines: Array<{
      id: string;
      predecessorId: string;
      successorId: string;
      linkType: string;
      path: string;
      hasCycle: boolean;
      lag: number;
      fromX: number;
      toX: number;
      fromY: number;
      reverseOrder: boolean;
      isVirtual: boolean;
      isCritical: boolean;
    }> = [];
```

3d. В цикле построения линий, после вычисления `hasCycle` (строка ~368), добавить:

```ts
      const isCritical = Boolean(
        criticalTaskIds?.has(edge.predecessorId) && criticalTaskIds.has(edge.successorId)
      );
```

3e. В `lines.push({ ... })` (строки 370–383) добавить поле:

```ts
        isCritical,
```

3f. В зависимости `lines` useMemo (строка ~388) добавить `criticalTaskIds`:

```ts
  }, [tasks, allTasks, taskPositions, taskIndices, cycleInfo, collapsedParentIds, criticalTaskIds]);
```

3g. В деструктуризации `lines.map(...)` (строка ~467) добавить `isCritical`:

```ts
      {lines.map(({ id, predecessorId, successorId, linkType, path, hasCycle, lag, fromX, toX, fromY, reverseOrder, isVirtual, isCritical }) => {
```

3h. В выборе класса (строки 473–476) добавить ветку critical (приоритет selected > cycle > critical):

```ts
        let pathClassName = 'gantt-dependency-path';
        if (isSelected) pathClassName += ' gantt-dependency-selected';
        else if (hasCycle) pathClassName += ' gantt-dependency-cycle';
        else if (isCritical) pathClassName += ' gantt-dependency-critical';
        if (isVirtual && !isSelected) pathClassName += ' gantt-dependency-virtual';
```

3i. В выборе `markerEnd` (строки 478–481) добавить ветку critical:

```ts
        let markerEnd: string;
        if (isSelected) markerEnd = 'url(#arrowhead-selected)';
        else if (hasCycle) markerEnd = 'url(#arrowhead-cycle)';
        else if (isCritical) markerEnd = 'url(#arrowhead-critical)';
        else markerEnd = 'url(#arrowhead)';
```

3j. В `lagColor` (строки 483–487) добавить ветку critical:

```ts
        const lagColor = isSelected
          ? '#ef4444'
          : hasCycle
            ? 'var(--gantt-dependency-cycle-color, #ef4444)'
            : isCritical
              ? 'var(--gantt-critical-path-color, #dc2626)'
              : 'var(--gantt-dependency-line-color, #666666)';
```

3k. В `<defs>` после marker `arrowhead-hover` (строка ~464) добавить:

```tsx
        {/* Red arrow marker for critical path dependency */}
        <marker
          id="arrowhead-critical"
          markerWidth="8"
          markerHeight="6"
          markerUnits="userSpaceOnUse"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill="var(--gantt-critical-path-color, #dc2626)"
          />
        </marker>
```

- [ ] **Step 4: Запустить тесты, убедиться что проходят**

Run: `npx vitest run src/__tests__/criticalDependencyLines.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/DependencyLines/DependencyLines.tsx src/__tests__/criticalDependencyLines.test.tsx
git commit -m "feat: подсветка критических линий-зависимостей (DependencyLines criticalTaskIds)"
```

---

### Task 5: Интеграционные тесты GanttChart (highlight / hide / expired)

**Files:**
- Create: `src/__tests__/criticalPath.test.tsx`

**Interfaces:**
- Consumes: `criticalPathMode` пропс, `criticalTaskIds`, TaskRow `isCritical`, DependencyLines `criticalTaskIds` (всё из предыдущих задач)

- [ ] **Step 1: Написать интеграционный тест `src/__tests__/criticalPath.test.tsx`**

```tsx
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { GanttChart, type Task } from '../components/GanttChart';

vi.mock('../components/ui/DatePicker', () => ({
  DatePicker: ({ value }: { value?: string }) => <button type="button">{value}</button>,
}));

vi.mock('../components/ui/Popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makeTask(partial: Partial<Task> & { id: string; startDate: string; endDate: string; dependencies?: Task['dependencies']; parentId?: string }): Task {
  return { name: partial.id, ...partial } as Task;
}

function getBar(container: HTMLElement, taskId: string) {
  return container.querySelector(`[data-gantt-task-row-id="${taskId}"] [data-taskbar]`) as HTMLElement | null;
}

function getRow(container: HTMLElement, taskId: string) {
  return container.querySelector(`[data-gantt-task-row-id="${taskId}"]`) as HTMLElement | null;
}

describe('GanttChart criticalPathMode', () => {
  it('highlight mode paints critical bars and leaves non-critical bars untouched', () => {
    const tasks: Task[] = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'D', startDate: '2026-01-05', endDate: '2026-01-06' }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} criticalPathMode="highlight" rowHeight={36} headerHeight={36} />
    );

    expect(getBar(container, 'A')?.style.backgroundColor).toBe('var(--gantt-critical-path-color, #dc2626)');
    expect(getBar(container, 'B')?.style.backgroundColor).toBe('var(--gantt-critical-path-color, #dc2626)');
    expect(getBar(container, 'C')?.style.backgroundColor).toBe('var(--gantt-critical-path-color, #dc2626)');
    expect(getBar(container, 'D')?.style.backgroundColor).toBe('var(--gantt-task-bar-default-color)');
  });

  it('highlight mode marks the FS chain lines as critical', () => {
    const tasks: Task[] = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'C', startDate: '2026-01-11', endDate: '2026-01-13', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }] }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} criticalPathMode="highlight" rowHeight={36} headerHeight={36} />
    );

    expect(container.querySelectorAll('.gantt-dependency-critical').length).toBe(2);
  });

  it('hide mode keeps only critical tasks and their parents', () => {
    const tasks: Task[] = [
      makeTask({ id: 'P', startDate: '2026-01-05', endDate: '2026-01-13' }),
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07', parentId: 'P' }),
      makeTask({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', parentId: 'P', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
      makeTask({ id: 'D', startDate: '2026-01-05', endDate: '2026-01-06' }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} criticalPathMode="hide" rowHeight={36} headerHeight={36} />
    );

    expect(getRow(container, 'P')).not.toBeNull();
    expect(getRow(container, 'A')).not.toBeNull();
    expect(getRow(container, 'B')).not.toBeNull();
    expect(getRow(container, 'D')).toBeNull();
  });

  it('does not filter rows when criticalPathMode is off', () => {
    const tasks: Task[] = [
      makeTask({ id: 'A', startDate: '2026-01-05', endDate: '2026-01-07' }),
      makeTask({ id: 'D', startDate: '2026-01-05', endDate: '2026-01-06' }),
    ];

    const { container } = render(
      <GanttChart tasks={tasks} rowHeight={36} headerHeight={36} />
    );

    expect(getRow(container, 'A')).not.toBeNull();
    expect(getRow(container, 'D')).not.toBeNull();
  });
});
```

Примечание про expired-приоритет в интеграции: не добавляем отдельный тест, т.к. GanttChart использует `getTodayLocalUtcDate()` и mock Date глобально; приоритет expired над critical уже покрыт unit-тестом Task 3 (Step 1, третий тест). Это осознанное упрощение, задокументированное в спеке (тест 12 покрывается на уровне TaskRow).

- [ ] **Step 2: Запустить тест, убедиться что проходит**

Run: `npx vitest run src/__tests__/criticalPath.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 3: Прогнать весь пакет тестов и lint**

Run: `npx vitest run`
Expected: все тесты проходят (включая существующие).

Run: `npm run lint` (в `packages/gantt-lib`)
Expected: без новых ошибок в `src`.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/criticalPath.test.tsx
git commit -m "test: интеграционные тесты criticalPathMode (highlight/hide)"
```

---

## Селф-ревью (по спеке)

- **Алгоритм CPM** → Task 1: forward/backward pass на абстрактной шкале, `float === 0`, вес = рабочие дни, лаг календарный, только FS. ✓
- **Наследование родителям** → Task 1 (`extendCriticalIdsToParents`), Task 2 Step 6 (вызов в GanttChart). ✓
- **Пропс только в gantt-режиме** → Task 2 Step 3 (`GanttModeProps`), Step 5 (сужение union). ✓
- **highlight — цвет барров** → Task 3. ✓
- **highlight — подсветка линий** → Task 4. ✓
- **hide — скрыть некритичные, предки сохраняются** → Task 2 Step 7 (фильтр по `criticalTaskIds`, куда уже включены предки). ✓
- **Путь без связей — пусто** → Task 1 (тест isolated). ✓
- **Несколько путей макс. длины — все критичны** → Task 1 (тест equal branches). ✓
- **expired приоритетнее** → Task 3 (порядок `isExpired` > `isCritical` в `barColor`). ✓
- **CSS-переменная `--gantt-critical-path-color`** → Task 2 Step 1. ✓
- **Циклы не зависают** → Task 1 (Kahn, тест cycle). ✓
- **Регрессия table-matrix/plan-fact** → Task 5 (пропс недоступен в этих режимах на уровне типов; существующие тесты проходят). ✓

Проверка типов между задачами:
- `computeCriticalPath(tasks: ScheduleTask[], options?)` — Task 2 вызывает с `normalizedTasks` (Task[] совместим структурно с ScheduleTask[]) и `{ businessDays, weekendPredicate }`. ✓
- `extendCriticalIdsToParents(Set<string>, ScheduleTask[])` — Task 2 вызывает с `leafCritical` и `normalizedTasks`. ✓
- `isCritical: boolean` — Task 2 Step 8 → Task 3 пропс. ✓
- `criticalTaskIds: Set<string>` — Task 2 Step 9 → Task 4 пропс. ✓

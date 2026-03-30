---
phase: 28-scheduling-core-hardening
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/core/scheduling/types.ts
  - packages/gantt-lib/src/core/scheduling/execute.ts
  - packages/gantt-lib/src/core/scheduling/__tests__/execute.test.ts
autonomous: true
requirements: [FR-2, FR-4]

must_haves:
  truths:
    - "moveTaskWithCascade создает movedTask + cascade результат за один вызов"
    - "resizeTaskWithCascade обрабатывает anchor start/end корректно"
    - "recalculateTaskFromDependencies пересчитывает lag одной задачи"
    - "recalculateProjectSchedule делает полный пересчет snapshot"
    - "ScheduleTask тип принимает задачу с минимальными полями"
    - "ScheduleCommandResult возвращает changedTasks + changedIds"
  artifacts:
    - path: "packages/gantt-lib/src/core/scheduling/types.ts"
      provides: "ScheduleTask, ScheduleDependency, ScheduleTaskUpdate, ScheduleCommandResult, ScheduleCommandOptions"
      contains: "ScheduleTask"
    - path: "packages/gantt-lib/src/core/scheduling/execute.ts"
      provides: "moveTaskWithCascade, resizeTaskWithCascade, recalculateTaskFromDependencies, recalculateProjectSchedule"
      exports: ["moveTaskWithCascade", "resizeTaskWithCascade", "recalculateTaskFromDependencies", "recalculateProjectSchedule"]
    - path: "packages/gantt-lib/src/core/scheduling/__tests__/execute.test.ts"
      provides: "Parity tests for all 4 commands"
      min_lines: 150
  key_links:
    - from: "core/scheduling/execute.ts"
      to: "core/scheduling/commands.ts"
      via: "moveTaskRange, recalculateIncomingLags"
      pattern: "import.*from.*'./commands'"
    - from: "core/scheduling/execute.ts"
      to: "core/scheduling/cascade.ts"
      via: "universalCascade"
      pattern: "import.*from.*'./cascade'"
    - from: "core/scheduling/execute.ts"
      to: "core/scheduling/hierarchy.ts"
      via: "computeParentDates, getChildren"
      pattern: "import.*from.*'./hierarchy'"
---

<objective>
Создать доменные типы (ScheduleTask, ScheduleCommandResult) и command-level API (execute.ts) — фундамент для server-ready scheduling core.

Purpose: Downstream-потребители смогут вызывать `moveTaskWithCascade(taskId, newStart, snapshot)` вместо ручной композиции moveTaskRange + universalCascade + recalculateIncomingLags + parent recompute.
Output: types.ts с новыми типами, execute.ts с 4 командами, execute.test.ts с parity-тестами.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/28-scheduling-core-hardening/CONTEXT.md
@.planning/phases/28-scheduling-core-hardening/RESEARCH.md

<interfaces>
<!-- Текущие типы и сигнатуры, которые executor должен использовать -->

From src/types/index.ts:
```typescript
export type LinkType = 'FS' | 'SS' | 'FF' | 'SF';
export interface TaskDependency { taskId: string; type: LinkType; lag: number; }
export interface Task {
  id: string; name: string; startDate: string | Date; endDate: string | Date;
  color?: string; parentId?: string; progress?: number; accepted?: boolean;
  dependencies?: TaskDependency[]; locked?: boolean;
}
```

From src/core/scheduling/types.ts (текущий):
```typescript
export type { LinkType, TaskDependency, DependencyError, ValidationResult, Task } from '../../types';
```

From src/core/scheduling/commands.ts — ключевые экспорты для композиции:
```typescript
export function moveTaskRange(originalStart, originalEnd, proposedStart, businessDays?, weekendPredicate?, snapDirection?): { start: Date; end: Date }
export function recalculateIncomingLags(task, newStartDate, newEndDate, allTasks, businessDays?, weekendPredicate?): NonNullable<Task['dependencies']>
export function buildTaskRangeFromStart(startDate, duration, businessDays?, weekendPredicate?, snapDirection?): { start: Date; end: Date }
export function buildTaskRangeFromEnd(endDate, duration, businessDays?, weekendPredicate?, snapDirection?): { start: Date; end: Date }
```

From src/core/scheduling/cascade.ts:
```typescript
export function universalCascade(movedTask, newStart, newEnd, allTasks, businessDays?, weekendPredicate?): Task[]
```

From src/core/scheduling/hierarchy.ts:
```typescript
export function isTaskParent(taskId, tasks): boolean
export function computeParentDates(parentId, tasks): { startDate: Date; endDate: Date }
export function computeParentProgress(parentId, tasks): number
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Добавить доменные типы в core/scheduling/types.ts</name>
  <files>packages/gantt-lib/src/core/scheduling/types.ts</files>
  <behavior>
    - ScheduleTask принимает объект с полями id, startDate, endDate (обязательные) + опциональные dependencies, parentId, locked, progress
    - ScheduleDependency описывает зависимость: type, taskId, lag?
    - ScheduleTaskUpdate описывает обновление: id + changed fields
    - ScheduleCommandResult содержит changedTasks: Task[] + changedIds: string[]
    - ScheduleCommandOptions содержит businessDays?, weekendPredicate?, skipCascade?
    - Все типы экспортированы из types.ts и доступны через index.ts
  </behavior>
  <action>
В файле `packages/gantt-lib/src/core/scheduling/types.ts` добавить НОВЫЕ типы ПОСЛЕ существующих реэкспортов. НЕ менять существующие реэкспорты LinkType, Task, TaskDependency и т.д.

Новые типы:

```typescript
/** Минимальный shape задачи для scheduling-операций */
export interface ScheduleTask {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  dependencies?: TaskDependency[];
  parentId?: string;
  locked?: boolean;
  progress?: number;
}

/** Dependency для scheduling-операций */
export interface ScheduleDependency {
  type: LinkType;
  taskId: string;
  lag?: number;
}

/** Обновление одной задачи (id + изменённые поля) */
export interface ScheduleTaskUpdate {
  id: string;
  startDate?: string;
  endDate?: string;
  dependencies?: TaskDependency[];
  progress?: number;
}

/** Результат выполнения scheduling-команды */
export interface ScheduleCommandResult {
  /** Все задачи, изменившиеся в результате команды (включая исходную) */
  changedTasks: Task[];
  /** ID изменившихся задач */
  changedIds: string[];
}

/** Опции для scheduling-команд */
export interface ScheduleCommandOptions {
  /** Учитывать бизнес-дни при cascade */
  businessDays?: boolean;
  /** Предикат выходных дней */
  weekendPredicate?: (date: Date) => boolean;
  /** Пропустить cascade, пересчитать только саму задачу */
  skipCascade?: boolean;
}
```

После этого обновить barrel `core/scheduling/index.ts` — он уже делает `export * from './types'`, так что новые типы автоматически станут доступны.
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>types.ts содержит ScheduleTask, ScheduleDependency, ScheduleTaskUpdate, ScheduleCommandResult, ScheduleCommandOptions. Компиляция без ошибок. Типы доступны из core/scheduling.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Создать execute.ts с 4 command-функциями и parity-тестами</name>
  <files>packages/gantt-lib/src/core/scheduling/execute.ts, packages/gantt-lib/src/core/scheduling/__tests__/execute.test.ts</files>
  <behavior>
    - moveTaskWithCascade: перемещает задачу на newStart, пересчитывает lags, запускает cascade, возвращает ScheduleCommandResult
    - resizeTaskWithCascade: anchor='start' — новая дата начала при фиксированном конце; anchor='end' — новая дата конца при фиксированном начале; cascade + lag пересчет
    - recalculateTaskFromDependencies: находит все predecessors, пересчитывает дату задачи по constraints, cascade + lag
    - recalculateProjectSchedule: для каждой задачи без predecessors запускает universalCascade, собирает все изменения
    - Поведение идентично ручной композиции в useTaskDrag.ts (handleComplete lines 657-676)
  </behavior>
  <action>
Сначала создать тестовый файл `packages/gantt-lib/src/core/scheduling/__tests__/execute.test.ts` с parity-тестами.

Сценарии для тестирования (использовать helpers для создания task fixtures):

1. **moveTaskWithCascade — FS successor:**
   - predecessor (Jan 1-5), successor FS lag=0 (Jan 6-10)
   - move predecessor to Jan 3-7
   - successor должен сдвинуться на Jan 8-12

2. **moveTaskWithCascade — SS successor:**
   - predecessor (Jan 1-5), successor SS lag=0 (Jan 1-5)
   - move predecessor to Jan 3-7
   - successor должен сдвинуться на Jan 3-7

3. **moveTaskWithCascade — FF successor:**
   - predecessor (Jan 1-5), successor FF lag=0 (Jan 1-5)
   - move predecessor to Jan 3-7
   - successor end = Jan 7, start сдвигается соответственно

4. **moveTaskWithCascade — SF successor:**
   - predecessor (Jan 1-5), successor SF lag=0 (Jan 1-5)
   - move predecessor to Jan 3-7

5. **moveTaskWithCascade — negative FS lag:**
   - predecessor (Jan 1-5), successor FS lag=-2 (overlap)
   - move predecessor to Jan 3-7
   - successor должен пересчитаться с lag=-2

6. **moveTaskWithCascade — business days:**
   - predecessor (Mon-Fri), successor FS lag=0 (next Mon-Fri)
   - weekendPredicate = Sat/Sun
   - move predecessor на 2 дня вперед
   - cascade должен пропустить выходные

7. **moveTaskWithCascade — parent with children:**
   - parent (Jan 1-10), child1 (Jan 1-5), child2 (Jan 6-10)
   - move parent to Jan 3-12
   - children должны сдвинуться пропорционально

8. **resizeTaskWithCascade — anchor='end':**
   - task (Jan 1-5), successor FS lag=0 (Jan 6-10)
   - resize task end to Jan 3
   - successor должен пересчитаться

9. **resizeTaskWithCascade — anchor='start':**
   - task (Jan 1-5), successor FS lag=0 (Jan 6-10)
   - resize task start to Jan 3 (end fixed at Jan 5)
   - successor не должен измениться (end не изменился)

10. **recalculateTaskFromDependencies:**
    - predecessor (Jan 1-5), successor FS lag=2 (Jan 8-12)
    - call recalculateTaskFromDependencies на successor
    - dates должны пересчитаться по constraints

11. **recalculateProjectSchedule:**
    - 3 задачи: A (no deps, Jan 1-5), B (FS from A, lag=0), C (FS from B, lag=0)
    - A moved to Jan 3-7
    - Вызов recalculateProjectSchedule должен cascade через весь граф

12. **recalculateIncomingLags — explicit lag recalculation path:**
    - predecessor (Jan 1-5), successor FS lag=3
    - move successor to Jan 10-14
    - lag должен обновиться до 4 (10 - 5 - 1)

Все тесты используют чистые Date объекты и массивы Task — никаких DOM/React/jsdom.

Затем создать `packages/gantt-lib/src/core/scheduling/execute.ts`:

```typescript
/**
 * Command-level scheduling API.
 * High-level functions that compose low-level scheduling primitives.
 * Zero React/DOM/date-fns imports.
 */

import type { Task, ScheduleCommandResult, ScheduleCommandOptions } from './types';
import { moveTaskRange, recalculateIncomingLags } from './commands';
import { universalCascade } from './cascade';
import { computeParentDates, computeParentProgress, isTaskParent, getChildren } from './hierarchy';
import { parseDateOnly, getTaskDuration } from './dateMath';

/**
 * Переместить задачу на новую дату начала с cascade и lag-пересчетом.
 * Идентично ручной композиции: moveTaskRange -> recalculateIncomingLags -> universalCascade.
 */
export function moveTaskWithCascade(
  taskId: string,
  newStart: Date,
  snapshot: Task[],
  options?: ScheduleCommandOptions
): ScheduleCommandResult {
  // Implementation...
}
```

Ключевые правила реализации:
- Каждая команда — тонкая обёртка над существующими функциями, НЕ переписывать логику
- moveTaskWithCascade: найти задачу по taskId, вызвать moveTaskRange, recalculateIncomingLags, universalCascade — в точности как useTaskDrag handleComplete
- resizeTaskWithCascade: anchor='start' — buildTaskRangeFromEnd(newDate, duration); anchor='end' — buildTaskRangeFromStart(originalStart, newDuration)
- recalculateTaskFromDependencies: найти predecessors, calculateSuccessorDate по constraint, затем cascade
- recalculateProjectSchedule: пройти по всем root-задачам, universalCascade для каждой
- Возвращать { changedTasks, changedIds } где changedIds = changedTasks.map(t => t.id)
- Если задача не найдена — возвращать { changedTasks: [], changedIds: [] }
- Задачи с locked=true — cascade их пропускает (уже реализовано в universalCascade)

Обновить barrel index.ts: добавить `export * from './execute';` после `export * from './commands';`.
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npx vitest run src/core/scheduling/__tests__/execute.test.ts --reporter=verbose 2>&1 | tail -40</automated>
  </verify>
  <done>
    execute.ts содержит 4 exported функции. Все parity-тесты зеленые. Компиляция без ошибок. Функции доступны через core/scheduling/index.ts.
    Поведение идентично ручной композиции в useTaskDrag.
  </done>
</task>

</tasks>

<verification>
1. `cd packages/gantt-lib && npx vitest run src/core/scheduling/__tests__/execute.test.ts --reporter=verbose` — все тесты зелёные
2. `cd packages/gantt-lib && npx tsc --noEmit` — компиляция без ошибок
3. `cd packages/gantt-lib && npx vitest run` — все существующие тесты по-прежнему зелёные
</verification>

<success_criteria>
- types.ts содержит ScheduleTask, ScheduleCommandResult и ещё 3 типа
- execute.ts содержит 4 command-функции, каждая compose существующие low-level helpers
- 12+ parity-тестов покрывают FS/SS/FF/SF, negative lag, business days, parent+children
- Все тесты зелёные, компиляция без ошибок
- Существующие тесты не сломаны
</success_criteria>

<output>
After completion, create `.planning/phases/28-scheduling-core-hardening/28-01-SUMMARY.md`
</output>

---
---

---
phase: 28-scheduling-core-hardening
plan: 02
type: execute
wave: 2
depends_on: ["28-01"]
files_modified:
  - packages/gantt-lib/src/adapters/scheduling/drag.ts
  - packages/gantt-lib/src/adapters/scheduling/index.ts
  - packages/gantt-lib/src/core/scheduling/commands.ts
  - packages/gantt-lib/src/core/scheduling/index.ts
  - packages/gantt-lib/src/hooks/useTaskDrag.ts
  - packages/gantt-lib/src/utils/dependencyUtils.ts
autonomous: true
requirements: [FR-1]

must_haves:
  truths:
    - "core/scheduling/commands.ts не содержит resolveDateRangeFromPixels и clampDateRangeForIncomingFS"
    - "adapters/scheduling/drag.ts экспортирует resolveDateRangeFromPixels и clampDateRangeForIncomingFS"
    - "useTaskDrag импортирует UI-функции из adapters/scheduling, а не из core/scheduling"
    - "core/scheduling/index.ts содержит @deprecated re-export для backward compat"
    - "dependencyUtils.ts продолжает реэкспортировать UI-функции для backward compat"
    - "useTaskDrag работает идентично до и после рефакторинга"
  artifacts:
    - path: "packages/gantt-lib/src/adapters/scheduling/drag.ts"
      provides: "resolveDateRangeFromPixels, clampDateRangeForIncomingFS"
      exports: ["resolveDateRangeFromPixels", "clampDateRangeForIncomingFS"]
    - path: "packages/gantt-lib/src/adapters/scheduling/index.ts"
      provides: "Barrel for UI scheduling adapters"
      contains: "drag"
    - path: "packages/gantt-lib/src/core/scheduling/commands.ts"
      provides: "Domain commands only (no pixel functions)"
      min_lines: 10
  key_links:
    - from: "hooks/useTaskDrag.ts"
      to: "adapters/scheduling"
      via: "import resolveDateRangeFromPixels, clampDateRangeForIncomingFS"
      pattern: "from.*'../adapters/scheduling'"
    - from: "adapters/scheduling/drag.ts"
      to: "core/scheduling/commands.ts"
      via: "import moveTaskRange, buildTaskRangeFromStart, etc"
      pattern: "from.*'../../core/scheduling/commands'"
---

<objective>
Вынести UI-функции (resolveDateRangeFromPixels, clampDateRangeForIncomingFS) из core/scheduling/commands.ts в adapters/scheduling/drag.ts. Обновить импорты в useTaskDrag. Сохранить backward compat через @deprecated re-exports.

Purpose: Domain core не должен знать о пикселях, drag handles, chart coordinates. Чистый domain boundary.
Output: adapters/scheduling/ с UI-функциями, useTaskDrag обновлен, backward compat сохранен.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/28-scheduling-core-hardening/CONTEXT.md
@.planning/phases/28-scheduling-core-hardening/RESEARCH.md
@.planning/phases/28-scheduling-core-hardening/28-01-SUMMARY.md

<interfaces>
<!-- Функции для extraction (из commands.ts текущий код) -->

resolveDateRangeFromPixels — принимает pixel-координаты (left, width, dayWidth, monthStart) + Task + businessDays/weekendPredicate. Вызывает moveTaskRange, buildTaskRangeFromStart, buildTaskRangeFromEnd, alignToWorkingDay, getBusinessDaysCount.

clampDateRangeForIncomingFS — принимает Task + range + mode ('move'|'resize-left'|'resize-right') + allTasks + businessDays/weekendPredicate. Вызывает clampTaskRangeForIncomingFS из commands.ts (domain-функцию).

useTaskDrag.ts line 6 — единый import:
```typescript
import { buildTaskRangeFromEnd, buildTaskRangeFromStart, calculateSuccessorDate, clampTaskRangeForIncomingFS, getDependencyLag, getTransitiveCascadeChain, moveTaskRange, recalculateIncomingLags, getChildren, isTaskParent, universalCascade, resolveDateRangeFromPixels, clampDateRangeForIncomingFS } from '../core/scheduling';
```

useTaskDrag.ts call sites (4 для каждой функции):
- Lines 221-237: preview range (businessDays path)
- Lines 243-255: preview range (non-businessDays path)
- Lines 271-284: universal preview cascade
- Lines 600-616: handleComplete final conversion
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Создать adapters/scheduling/ и вынести UI-функции</name>
  <files>packages/gantt-lib/src/adapters/scheduling/drag.ts, packages/gantt-lib/src/adapters/scheduling/index.ts, packages/gantt-lib/src/core/scheduling/commands.ts</files>
  <action>
1. Создать директорию `packages/gantt-lib/src/adapters/scheduling/`.

2. Создать `packages/gantt-lib/src/adapters/scheduling/drag.ts`:
   - Скопировать функции `resolveDateRangeFromPixels` и `clampDateRangeForIncomingFS` VERBATIM из `core/scheduling/commands.ts`
   - Обновить imports: функции из commands.ts (moveTaskRange, buildTaskRangeFromStart, buildTaskRangeFromEnd, alignToWorkingDay, getBusinessDaysCount) импортировать из `../../core/scheduling/commands`
   - Тип Task импортировать из `../../core/scheduling/types`
   - Добавить JSDoc: `/** UI adapter: converts pixel coordinates to date ranges for drag interactions. @module adapters/scheduling */`

3. Создать `packages/gantt-lib/src/adapters/scheduling/index.ts`:
   ```typescript
   export { resolveDateRangeFromPixels, clampDateRangeForIncomingFS } from './drag';
   ```

4. Удалить функции `resolveDateRangeFromPixels` и `clampDateRangeForIncomingFS` из `packages/gantt-lib/src/core/scheduling/commands.ts`. Удалить связанные неиспользуемые imports (parseDateOnly больше не нужен для UI-функций, но проверить что он не используется в оставшихся функциях — он НЕ используется в clampTaskRangeForIncomingFS/recalculateIncomingLags, но проверить внимательно).

5. Обновить `packages/gantt-lib/src/core/scheduling/index.ts` — добавить backward-compat re-exports:
   ```typescript
   // UI adapter functions — re-exported for backward compatibility.
   // Consumers should migrate to importing from 'gantt-lib/adapters/scheduling' or '../adapters/scheduling'.
   /** @deprecated Import from 'gantt-lib/adapters/scheduling' instead */
   export { resolveDateRangeFromPixels, clampDateRangeForIncomingFS } from '../../adapters/scheduling';
   ```

6. Обновить `packages/gantt-lib/src/utils/dependencyUtils.ts` — добавить re-export для UI-функций:
   ```typescript
   /** @deprecated Import from 'gantt-lib/adapters/scheduling' instead */
   export { resolveDateRangeForPixels, clampDateRangeForIncomingFS } from '../adapters/scheduling';
   ```
   (Это нужно потому что dependencyUtils.ts уже реэкспортит всё из core/scheduling, но лучше добавить явный re-export из adapters для ясности. Проверить: dependencyUtils уже делает re-export из core/scheduling, который в свою очередь re-exportит из adapters — так что цепочка dependencyUtils -> core/scheduling -> adapters/scheduling уже работает через обновленный index.ts. ДОБАВЛЯТЬ НЕ НУЖНО, цепочка автоматическая.)
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>adapters/scheduling/drag.ts содержит resolveDateRangeFromPixels и clampDateRangeForIncomingFS. commands.ts НЕ содержит эти функции. core/scheduling/index.ts содержит @deprecated re-exports. Компиляция без ошибок.</done>
</task>

<task type="auto">
  <name>Task 2: Обновить useTaskDrag для импорта UI-функций из adapters</name>
  <files>packages/gantt-lib/src/hooks/useTaskDrag.ts</files>
  <action>
Обновить imports в `packages/gantt-lib/src/hooks/useTaskDrag.ts`:

Текущий единый import (line 6):
```typescript
import { buildTaskRangeFromEnd, buildTaskRangeFromStart, calculateSuccessorDate, clampTaskRangeForIncomingFS, getDependencyLag, getTransitiveCascadeChain, moveTaskRange, recalculateIncomingLags, getChildren, isTaskParent, universalCascade, resolveDateRangeFromPixels, clampDateRangeForIncomingFS } from '../core/scheduling';
```

Заменить на:
```typescript
// Domain scheduling functions
import {
  buildTaskRangeFromEnd,
  buildTaskRangeFromStart,
  calculateSuccessorDate,
  clampTaskRangeForIncomingFS,
  getDependencyLag,
  getTransitiveCascadeChain,
  moveTaskRange,
  recalculateIncomingLags,
  getChildren,
  isTaskParent,
  universalCascade,
} from '../core/scheduling';

// UI adapter functions (pixel-to-date conversion)
import { resolveDateRangeFromPixels, clampDateRangeForIncomingFS } from '../adapters/scheduling';
```

Это единственное изменение в файле. Все 8 call sites (4 для resolveDateRangeFromPixels, 4 для clampDateRangeForIncomingFS) продолжат работать — меняется только источник импорта.

Проверить что:
- Все call sites используют resolveDateRangeFromPixels и clampDateRangeForIncomingFS корректно
- Не осталось старых импортов этих функций из core/scheduling
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npx vitest run --reporter=verbose 2>&1 | tail -30</automated>
  </verify>
  <done>useTaskDrag импортирует UI-функции из adapters/scheduling, domain-функции из core/scheduling. Все существующие тесты зелёные. Drag-and-drop поведение не изменилось.</done>
</task>

</tasks>

<verification>
1. `cd packages/gantt-lib && npx vitest run --reporter=verbose` — все тесты зелёные
2. `cd packages/gantt-lib && npx tsc --noEmit` — компиляция без ошибок
3. `grep -r "resolveDateRangeFromPixels" packages/gantt-lib/src/core/scheduling/commands.ts` — пусто (функция удалена)
4. `grep -c "resolveDateRangeFromPixels\|clampDateRangeForIncomingFS" packages/gantt-lib/src/adapters/scheduling/drag.ts` — 2+ (функции на месте)
5. `grep "from.*adapters/scheduling" packages/gantt-lib/src/hooks/useTaskDrag.ts` — есть (useTaskDrag обновлен)
</verification>

<success_criteria>
- resolveDateRangeFromPixels и clampDateRangeForIncomingFS живут ТОЛЬКО в adapters/scheduling/drag.ts
- core/scheduling/commands.ts содержит только domain-функции (нет pixel-параметров)
- useTaskDrag импортирует UI-функции из adapters/scheduling
- Backward compat: импорт из core/scheduling всё ещё работает (через @deprecated re-export)
- Все тесты зелёные, компиляция без ошибок
</success_criteria>

<output>
After completion, create `.planning/phases/28-scheduling-core-hardening/28-02-SUMMARY.md`
</output>

---
---

---
phase: 28-scheduling-core-hardening
plan: 03
type: execute
wave: 3
depends_on: ["28-01", "28-02"]
files_modified:
  - packages/gantt-lib/src/core/scheduling/__tests__/boundary.test.ts
  - docs/reference/14-headless-scheduling.md
autonomous: true
requirements: [FR-3, FR-5, FR-6]

must_haves:
  truths:
    - "core/scheduling работает в pure Node без jsdom/React"
    - "Документация описывает normalizeDependencyLag FS lag >= -predecessorDuration (не >= 0)"
    - "Документация описывает cascadeByLinks per-type поведение (FS/SS → buildFromStart, FF/SF → buildFromEnd)"
    - "Документация отмечает UI adapter функции как отдельный модуль"
    - "Документация содержит command-level API секцию"
    - "Документация содержит downstream consumption guide"
    - "Документация содержит stability level markers"
  artifacts:
    - path: "packages/gantt-lib/src/core/scheduling/__tests__/boundary.test.ts"
      provides: "Node-only execution proof tests"
      min_lines: 30
    - path: "docs/reference/14-headless-scheduling.md"
      provides: "Accurate documentation matching code"
      contains: "execute.ts"
  key_links:
    - from: "boundary.test.ts"
      to: "core/scheduling/*"
      via: "import all modules and run scheduling operations"
      pattern: "from.*'../index'"
---

<objective>
Boundary-тесты (pure Node без jsdom), обновление документации (FR-5), downstream guide (FR-6).

Purpose: Доказать что core scheduling — server-ready (pure Node). Документация должна соответствовать коду.
Output: boundary.test.ts, обновлённая 14-headless-scheduling.md с command API, adapter separation, lag semantics, stability markers.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/28-scheduling-core-hardening/CONTEXT.md
@.planning/phases/28-scheduling-core-hardening/RESEARCH.md
@.planning/phases/28-scheduling-core-hardening/28-01-SUMMARY.md
@.planning/phases/28-scheduling-core-hardening/28-02-SUMMARY.md

<interfaces>
<!-- Документация gaps из RESEARCH.md -->

Gap 1: normalizeDependencyLag — doc says "FS: >= 0" but code clamps to >= -predecessorDuration
Gap 2: cascadeByLinks — doc says "каскад по FS-связям" but handles all link types (FS/SS → buildFromStart, FF/SF → buildFromEnd)
Gap 3: resolveDateRangeFromPixels — listed under commands.ts, should note it's UI adapter
Gap 4: No command-level API section
Gap 5: No stability level markers
Gap 6: Missing computeLagFromDates per-type semantics

Новая структура модуля после Phase 28:
```
core/scheduling/     — domain core (8 files + barrel)
  types.ts           — re-exports + ScheduleTask, ScheduleCommandResult, etc.
  dateMath.ts        — (unchanged)
  dependencies.ts    — (unchanged)
  cascade.ts         — (unchanged)
  commands.ts        — domain commands only (no UI functions)
  execute.ts         — NEW: moveTaskWithCascade, resizeTaskWithCascade, etc.
  validation.ts      — (unchanged)
  hierarchy.ts       — (unchanged)
  index.ts           — barrel + backward-compat re-exports
adapters/scheduling/ — UI adapter layer
  drag.ts            — resolveDateRangeFromPixels, clampDateRangeForIncomingFS
  index.ts           — barrel
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Создать boundary-тесты для pure Node execution</name>
  <files>packages/gantt-lib/src/core/scheduling/__tests__/boundary.test.ts</files>
  <behavior>
    - Все модули core/scheduling импортируются без ошибок в Node-окружении
    - moveTaskRange, universalCascade, recalculateIncomingLags выполняются без jsdom
    - moveTaskWithCascade из execute.ts выполняется без jsdom
    - Ни один импорт не тянет React
    - Ни один импорт не требует DOM globals
  </behavior>
  <action>
Создать `packages/gantt-lib/src/core/scheduling/__tests__/boundary.test.ts`.

ВАЖНО: Тесты должны запускаться в vitest environment='node' (а не jsdom по умолчанию). Добавить в начало файла:
```typescript
// @vitest-environment node
```

Тесты:

1. **"core/scheduling imports без React"**:
   ```typescript
   // Проверить что ни один модуль не импортирует React
   const fs = require('fs');
   const path = require('path');
   const schedulingDir = path.join(__dirname, '..');
   const files = fs.readdirSync(schedulingDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
   for (const file of files) {
     const content = fs.readFileSync(path.join(schedulingDir, file), 'utf-8');
     expect(content).not.toContain("from 'react'");
     expect(content).not.toContain('require("react")');
   }
   ```

2. **"core/scheduling imports без DOM globals"**:
   Аналогично, проверить что files не содержат `document.`, `window.`, `navigator.`.

3. **"scheduling functions работают без jsdom"**:
   ```typescript
   import { moveTaskRange, universalCascade, recalculateIncomingLags, calculateSuccessorDate, moveTaskWithCascade } from '../index';
   // Создать простые task fixtures и вызвать функции
   // Убедиться что результат корректный
   ```

4. **"execute.ts работает без jsdom"**:
   ```typescript
   import { moveTaskWithCascade } from '../execute';
   // Создать snapshot задач и вызвать moveTaskWithCascade
   // Проверить результат
   ```

5. **"types доступны без runtime зависимостей"**:
   ```typescript
   import type { ScheduleTask, ScheduleCommandResult, ScheduleCommandOptions } from '../types';
   // Просто проверить что типы компилируются
   const task: ScheduleTask = { id: '1', startDate: '2024-01-01', endDate: '2024-01-05' };
   expect(task.id).toBe('1');
   ```
  </action>
  <verify>
    <automated>cd packages/gantt-lib && npx vitest run src/core/scheduling/__tests__/boundary.test.ts --reporter=verbose 2>&1 | tail -20</automated>
  </verify>
  <done>boundary.test.ts содержит 5+ тестов, все зелёные. Тесты работают в Node environment (не jsdom). Доказано что core/scheduling не зависит от React/DOM.</done>
</task>

<task type="auto">
  <name>Task 2: Обновить документацию 14-headless-scheduling.md</name>
  <files>docs/reference/14-headless-scheduling.md</files>
  <action>
Полностью переписать `docs/reference/14-headless-scheduling.md` с учётом изменений Phase 28. Документация на русском (проект convention).

Структура нового документа:

## Обновить "Структура модуля":
Добавить execute.ts и adapters/scheduling/:
```
src/core/scheduling/
├── types.ts          — Типы: Task, ScheduleTask, ScheduleCommandResult, etc.
├── dateMath.ts       — Дата-математика
├── dependencies.ts   — Расчёт successor-дат, lag-нормализация
├── cascade.ts        — Каскадное распространение изменений
├── commands.ts       — Доменные команды: moveTaskRange, clamp, recalculateLags
├── execute.ts        — Command-level API (stable)
├── validation.ts     — Валидация зависимостей
├── hierarchy.ts      — Иерархия задач
└── index.ts          — Barrel re-export

src/adapters/scheduling/     — UI adapter layer
├── drag.ts                  — Пиксельно-дата конвертация для drag
└── index.ts                 — Barrel
```

## Исправить dependencies.ts таблицу:
- normalizeDependencyLag: "Нормализует lag (FS: >= -predecessorDuration, не >= 0)"
- computeLagFromDates: добавить per-type semantics: "FS: lag = succStart - predEnd - 1; SS: lag = succStart - predStart; FF: lag = succEnd - predEnd; SF: lag = succEnd - predStart + 1"

## Исправить cascade.ts таблицу:
- cascadeByLinks: "Каскад по всем типам связей (FS/SS → buildFromStart, FF/SF → buildFromEnd)"
- Добавить уточнение: "FS и SS successors пересчитываются от start date; FF и SF — от end date"

## Обновить commands.ts секцию:
- Удалить resolveDateRangeFromPixels и clampDateRangeForIncomingFS из таблицы
- Добавить пометку: "UI-функции перемещены в adapters/scheduling/"
- Оставшиеся функции: buildTaskRangeFromStart, buildTaskRangeFromEnd, moveTaskRange, clampTaskRangeForIncomingFS, recalculateIncomingLags

## Добавить секцию "execute.ts — Command-level API (stable)":
```markdown
### execute.ts — Command-level API

@stability stable

Высокоуровневые команды, инкапсулирующие типичные scheduling-операции.
Каждая команда compose существующие low-level helpers.

| Функция | Описание |
|---|---|
| moveTaskWithCascade(taskId, newStart, snapshot, options?) | Переместить задачу + cascade + lag пересчёт |
| resizeTaskWithCascade(taskId, anchor, newDate, snapshot, options?) | Resize задачи + cascade + lag пересчёт |
| recalculateTaskFromDependencies(taskId, snapshot, options?) | Пересчитать даты задачи по constraints predecessors |
| recalculateProjectSchedule(snapshot, options?) | Полный пересчёт всех задач в snapshot |

**ScheduleCommandOptions:** businessDays?, weekendPredicate?, skipCascade?
**ScheduleCommandResult:** { changedTasks: Task[], changedIds: string[] }
```

## Добавить секцию "adapters/scheduling — UI Adapter Layer":
```markdown
### adapters/scheduling/ — UI Adapter Layer

@stability internal

Функции конвертации pixel-координат в domain-даты. Используются drag-and-drop interaction layer.
Не являются частью headless scheduling API.

| Функция | Описание |
|---|---|
| resolveDateRangeFromPixels(mode, left, width, monthStart, dayWidth, task, ...) | Конвертация пикселей в даты |
| clampDateRangeForIncomingFS(task, range, allTasks, mode, ...) | Ограничение range для drag |
```

## Добавить секцию "Downstream Consumption Contract":
```markdown
## Downstream Consumption Contract

### Recommended import path
```typescript
import { moveTaskWithCascade, resizeTaskWithCascade, ... } from 'gantt-lib/core/scheduling';
```

### Stable entry points
- `gantt-lib/core/scheduling` — все scheduling-функции (CJS + ESM + DTS)

### Stability levels
- **stable** — public API, backward-compat гарантирован: execute.ts (4 команды), types, dateMath, dependencies, validation, hierarchy
- **public** — public API, может меняться: commands.ts (low-level helpers)
- **internal** — для внутреннего использования: cascade.ts (низкоуровневый cascade), adapters/scheduling/
- **deprecated** — будет удалён: импорт UI-функций через core/scheduling barrel

### Minimal task shape для scheduling
```typescript
const task: ScheduleTask = {
  id: 'task-1',
  startDate: '2024-01-01',
  endDate: '2024-01-05',
};
```

### Что authoritative
Команды возвращают полные Task objects (spread из input), но authoritative являются только scheduling-поля: startDate, endDate, dependencies, progress. Остальные поля (name, color, accepted) — pass-through.
```

## Обновить секцию "Гарантии":
Добавить: "Command-level API доступен через `gantt-lib/core/scheduling` entry point"

## Добавить markers к каждой секции:
- @stability stable/public/internal/deprecated
  </action>
  <verify>
    <automated>test -f docs/reference/14-headless-scheduling.md && grep -c "execute.ts" docs/reference/14-headless-scheduling.md && grep -c "adapters/scheduling" docs/reference/14-headless-scheduling.md && grep "predecessorDuration" docs/reference/14-headless-scheduling.md | wc -l</automated>
  </verify>
  <done>
    14-headless-scheduling.md содержит:
    - Исправленное описание normalizeDependencyLag (>= -predecessorDuration)
    - Исправленное описание cascadeByLinks (per-type behavior)
    - Секцию execute.ts с 4 command-функциями
    - Секцию adapters/scheduling с UI-функциями
    - Downstream consumption contract
    - Stability level markers
  </done>
</task>

</tasks>

<verification>
1. `cd packages/gantt-lib && npx vitest run src/core/scheduling/__tests__/boundary.test.ts --reporter=verbose` — все boundary-тесты зелёные
2. `cd packages/gantt-lib && npx vitest run` — все тесты зелёные (regression)
3. `grep "execute.ts" docs/reference/14-headless-scheduling.md` — есть секция для command API
4. `grep "predecessorDuration" docs/reference/14-headless-scheduling.md` — исправленное описание lag
5. `grep "adapters/scheduling" docs/reference/14-headless-scheduling.md` — UI adapter секция
</verification>

<success_criteria>
- boundary.test.ts: 5+ тестов доказывают pure Node execution
- Документация исправлена: normalizeDependencyLag semantics, cascadeByLinks per-type, UI adapter separation
- Документация добавлена: execute.ts command API, downstream contract, stability markers
- Все тесты зелёные, компиляция без ошибок
</success_criteria>

<output>
After completion, create `.planning/phases/28-scheduling-core-hardening/28-03-SUMMARY.md`
</output>

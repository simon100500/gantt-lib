# Headless Scheduling Core

Библиотека включает headless-модуль планирования в `src/core/scheduling/` — runtime-агностический код с **нулевыми** зависимостями от React, DOM и date-fns. Это позволяет использовать scheduling-логику без UI.

@stability stable

## Обратная совместимость

Существующий импорт из `gantt-lib` работает без изменений:

```typescript
import { universalCascade, calculateSuccessorDate } from 'gantt-lib';
// Работает как раньше — через re-export цепочку
```

Внутри библиотеки цепочка реэкспортов:
```
gantt-lib → src/index.ts → utils/index.ts → dependencyUtils.ts → core/scheduling/*
```

`dependencyUtils.ts` теперь содержит только реэкспорты, ноль function-реализаций.

## Прямой импорт из core (для downstream-репо)

Downstream-проекты (MCP-сервер, Node.js-скрипты и т.д.) могут импортировать только scheduling-логику, не подключая React и UI:

```typescript
import {
  calculateSuccessorDate,
  universalCascade,
  moveTaskRange,
  validateDependencies,
} from 'gantt-lib/core/scheduling';
```

Этот путь сконфигурирован в `exports` map package.json — tsup собирает `core/scheduling` как отдельный entry point (CJS + ESM + DTS). В bundle попадает только scheduling-код, без React, DOM и date-fns.

## Структура модуля

@stability stable

```
src/core/scheduling/
├── types.ts          — Типы: Task, ScheduleTask, ScheduleCommandResult, ScheduleCommandOptions, etc.
├── dateMath.ts       — Дата-математика: normalizeUTCDate, бизнес-дни, DAY_MS
├── dependencies.ts   — Расчёт successor-дат, lag-нормализация
├── cascade.ts        — Каскадное распространение изменений
├── commands.ts       — Доменные команды: moveTaskRange, clamp, recalculateLags
├── execute.ts        — Command-level API (stable) — высокоуровневые команды
├── validation.ts     — Валидация зависимостей, обнаружение циклов
├── hierarchy.ts      — Иерархия задач: дети, родители, агрегация дат
└── index.ts          — Barrel re-export + backward-compat deprecated re-exports

src/adapters/scheduling/     — UI adapter layer
├── drag.ts                  — Пиксельно-дата конвертация для drag
└── index.ts                 — Barrel
```

## API Reference

### types.ts

@stability stable

```typescript
// Re-exports from library types
export type { LinkType, TaskDependency, DependencyError, ValidationResult, Task } from '../../types';

// Core scheduling domain types
export interface ScheduleTask {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  dependencies?: TaskDependency[];
  parentId?: string;
  locked?: boolean;
  progress?: number;
}

export interface ScheduleCommandResult {
  changedTasks: Task[];
  changedIds: string[];
}

export interface ScheduleCommandOptions {
  businessDays?: boolean;
  weekendPredicate?: (date: Date) => boolean;
  skipCascade?: boolean;
}
```

### dateMath.ts

@stability stable

Чистые функции для работы с датами. Ноль побочных эффектов.

| Функция | Сигнатура | Описание |
|---|---|---|
| `DAY_MS` | `const 86400000` | Миллисекунд в сутках |
| `normalizeUTCDate` | `(date: Date) => Date` | Приводит дату к UTC midnight |
| `parseDateOnly` | `(date: string \| Date) => Date` | Парсит ISO-строку в UTC Date |
| `getBusinessDayOffset` | `(from, to, weekendPredicate?) => number` | Offset в рабочих днях |
| `shiftBusinessDayOffset` | `(date, offset, weekendPredicate?) => Date` | Сдвигает дату на offset рабочих дней |
| `alignToWorkingDay` | `(date, direction, weekendPredicate?) => Date` | Приводит к рабочему дню (вперёд/назад) |
| `getTaskDuration` | `(start, end, businessDays?, weekendPredicate?) => number` | Длительность задачи в днях |

### dependencies.ts

@stability stable

Расчёт дат successor-задач по связям FS/SS/FF/SF.

| Функция | Описание |
|---|---|
| `getDependencyLag(dep)` | Возвращает lag или 0 |
| `normalizeDependencyLag(linkType, lag, predStart, predEnd, businessDays?, weekendPredicate?)` | Нормализует lag: FS — clamp к >= -predecessorDuration (не >= 0). Остальные типы — без изменений |
| `calculateSuccessorDate(predStart, predEnd, linkType, lag?, businessDays?, weekendPredicate?)` | Вычисляет дату successor. FS: predEnd + lag + 1; SS: predStart + lag; FF: predEnd + lag; SF: predStart + lag - 1 |
| `computeLagFromDates(linkType, predStart, predEnd, succStart, succEnd, businessDays?, weekendPredicate?)` | Вычисляет lag из дат. FS: lag = succStart - predEnd - 1; SS: lag = succStart - predStart; FF: lag = succEnd - predEnd; SF: lag = succEnd - predStart + 1 |

### cascade.ts

@stability internal

Распространение изменений по цепочке зависимостей.

| Функция | Описание |
|---|---|
| `cascadeByLinks(movedTaskId, newStart, newEnd, allTasks, ...)` | Каскад по всем типам связей: FS/SS → buildFromStart, FF/SF → buildFromEnd |
| `universalCascade(movedTask, newStart, newEnd, allTasks, businessDays?, weekendPredicate?)` | Полный каскад: dependency + hierarchy (children follow parent, parent recomputed from children) |
| `getSuccessorChain(draggedTaskId, allTasks, linkTypes?)` | Транзитивные successors (BFS) |
| `getTransitiveCascadeChain(changedTaskId, allTasks, firstLevelLinkTypes?)` | Полная цепочка каскада |
| `reflowTasksOnModeSwitch(sourceTasks, toBusinessDays, weekendPredicate?)` | Конвертация business/calendar дней |

**Per-type поведение cascadeByLinks:** FS и SS successors пересчитываются от start date (buildFromStart). FF и SF successors пересчитываются от end date (buildFromEnd).

### commands.ts

@stability public

Доменные операции с задачами (pure scheduling, без pixel/UI параметров).

| Функция | Описание |
|---|---|
| `buildTaskRangeFromStart(startDate, duration, businessDays?, weekendPredicate?)` | Диапазон от start + duration |
| `buildTaskRangeFromEnd(endDate, duration, businessDays?, weekendPredicate?)` | Диапазон от end - duration |
| `moveTaskRange(originalStart, originalEnd, proposedStart, ...)` | Перемещение с сохранением длительности |
| `clampTaskRangeForIncomingFS(task, proposedStart, proposedEnd, allTasks, ...)` | Ограничение по входящим FS-связям |
| `recalculateIncomingLags(task, newStart, newEnd, allTasks, ...)` | Пересчёт lag после изменения дат |

> **Примечание:** UI-функции resolveDateRangeFromPixels и clampDateRangeForIncomingFS перемещены в `adapters/scheduling/`. Backward-compat re-exports через core/scheduling/index.ts помечены `@deprecated`.

### execute.ts — Command-level API

@stability stable

Высокоуровневые команды, инкапсулирующие типичные scheduling-операции.
Каждая команда compose существующие low-level helpers.

| Функция | Описание |
|---|---|
| `moveTaskWithCascade(taskId, newStart, snapshot, options?)` | Переместить задачу + cascade + lag пересчёт |
| `resizeTaskWithCascade(taskId, anchor, newDate, snapshot, options?)` | Resize задачи + cascade + lag пересчёт |
| `recalculateTaskFromDependencies(taskId, snapshot, options?)` | Пересчитать даты задачи по constraints predecessors |
| `recalculateProjectSchedule(snapshot, options?)` | Полный пересчёт всех задач в snapshot |

**ScheduleCommandOptions:** businessDays?, weekendPredicate?, skipCascade?
**ScheduleCommandResult:** { changedTasks: Task[], changedIds: string[] }

### validation.ts

@stability stable

| Функция | Описание |
|---|---|
| `buildAdjacencyList(tasks)` | Map predecessor → successors |
| `detectCycles(tasks)` | Обнаружение циклов в графе |
| `validateDependencies(tasks)` | Полная валидация: циклы, missing tasks, иерархия |

### hierarchy.ts

@stability stable

Работа с parent-child иерархией.

| Функция | Описание |
|---|---|
| `getChildren(parentId, tasks)` | Прямые дети |
| `isTaskParent(taskId, tasks)` | Есть ли дети |
| `computeParentDates(parentId, tasks)` | Агрегация min/max дат детей |
| `computeParentProgress(parentId, tasks)` | Weighted average прогресса детей |
| `getAllDescendants(parentId, tasks)` | Все потомки рекурсивно |
| `findParentId(taskId, tasks)` | parentId задачи |
| `isAncestorTask(ancestorId, taskId, tasks)` | Проверка предок/потомок |
| `areTasksHierarchicallyRelated(id1, id2, tasks)` | Связаны ли через иерархию |
| `removeDependenciesBetweenTasks(id1, id2, tasks)` | Удаление связей между двумя задачами |
| `getAllDependencyEdges(tasks)` | Все рёбра графа зависимостей |

### adapters/scheduling/ — UI Adapter Layer

@stability internal

Функции конвертации pixel-координат в domain-даты. Используются drag-and-drop interaction layer.
Не являются частью headless scheduling API.

| Функция | Описание |
|---|---|
| `resolveDateRangeFromPixels(mode, left, width, monthStart, dayWidth, task, ...)` | Конвертация пикселей в даты для drag |
| `clampDateRangeForIncomingFS(task, range, allTasks, mode, ...)` | Ограничение range для drag по FS-связям |

> **Обратная совместимость:** Эти функции реэкспортируются через core/scheduling/index.ts с пометкой `@deprecated`. Новые импорты должны использовать `adapters/scheduling`.

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

## Гарантии

- Ноль `import ... from 'react'` в core/scheduling
- Ноль `import ... from 'date-fns'` в core/scheduling
- Ноль обращений к `document.*` или DOM API
- Все функции — чистые, без побочных эффектов
- Все существующие тесты проходят через backward-compat re-export цепочку
- Command-level API доступен через `gantt-lib/core/scheduling` entry point
- Доказано boundary-тестами: core/scheduling работает в pure Node без jsdom

---

[← Back to API Reference](./INDEX.md)

# Headless Scheduling Core

Библиотека включает headless-модуль планирования в `src/core/scheduling/` — runtime-агностический код с **нулевыми** зависимостями от React, DOM и date-fns. Это позволяет использовать scheduling-логику без UI.

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

```
src/core/scheduling/
├── types.ts          — Типы: LinkType, Task, TaskDependency, ValidationResult, DependencyError
├── dateMath.ts       — Дата-математика: normalizeUTCDate, бизнес-дни, DAY_MS
├── dependencies.ts   — Расчёт successor-дат, lag-нормализация
├── cascade.ts        — Каскадное распространение изменений
├── commands.ts       — Высокоуровневые команды: moveTaskRange, clamp, resolve
├── validation.ts     — Валидация зависимостей, обнаружение циклов
├── hierarchy.ts      — Иерархия задач: дети, родители, агрегация дат
└── index.ts          — Barrel re-export
```

## API Reference

### types.ts

```typescript
export type { LinkType, TaskDependency, DependencyError, ValidationResult, Task } from '../../types';
```

### dateMath.ts

Чистые функции для работы с датами. Ноль побочных эффектов.

| Функция | Сигнатура | Описание |
|---|---|---|
| `DAY_MS` | `const 86400000` | Миллисекунд в сутках |
| `normalizeUTCDate` | `(date: Date) => Date` | Приводит дату к UTC midnight |
| `parseDateOnly` | `(date: string \| Date) => Date` | Парсит ISO-строку в UTC Date |
| `getBusinessDaysCount` | `(start, end, weekendPredicate?) => number` | Считает рабочие дни между датами |
| `addBusinessDays` | `(start, days, weekendPredicate?) => Date` | Добавляет N рабочих дней |
| `subtractBusinessDays` | `(end, days, weekendPredicate?) => Date` | Вычитает N рабочих дней |
| `getBusinessDayOffset` | `(from, to, weekendPredicate?) => number` | Offset в рабочих днях |
| `shiftBusinessDayOffset` | `(date, offset, weekendPredicate?) => Date` | Сдвигает дату на offset рабочих дней |
| `alignToWorkingDay` | `(date, direction, weekendPredicate?) => Date` | Приводит к рабочему дню (вперёд/назад) |
| `getTaskDuration` | `(start, end, businessDays?, weekendPredicate?) => number` | Длительность задачи в днях |

### dependencies.ts

Расчёт дат successor-задач по связям FS/SS/FF/SF.

| Функция | Описание |
|---|---|
| `getDependencyLag(dep)` | Возвращает lag или 0 |
| `normalizeDependencyLag(linkType, lag, businessDays?, weekendPredicate?)` | Нормализует lag (FS: ≥ 0) |
| `calculateSuccessorDate(predStart, predEnd, linkType, lag?, businessDays?, weekendPredicate?)` | Вычисляет дату successor |
| `computeLagFromDates(linkType, predStart, predEnd, succStart, succEnd, businessDays?, weekendPredicate?)` | Вычисляет lag из дат |

### cascade.ts

Распространение изменений по цепочке зависимостей.

| Функция | Описание |
|---|---|
| `cascadeByLinks(movedTaskId, newStart, newEnd, allTasks, ...)` | Каскад по FS-связям |
| `universalCascade(movedTask, newStart, newEnd, allTasks, ...)` | Каскад по всем типам связей |
| `getSuccessorChain(draggedTaskId, allTasks, linkTypes?)` | Транзитивные successors |
| `getTransitiveCascadeChain(changedTaskId, allTasks, firstLevelLinkTypes?)` | Полная цепочка каскада |
| `reflowTasksOnModeSwitch(sourceTasks, toBusinessDays, weekendPredicate?)` | Конвертация business/calendar дней |

### commands.ts

Высокоуровневые операции с задачами.

| Функция | Описание |
|---|---|
| `buildTaskRangeFromStart(startDate, duration, businessDays?, weekendPredicate?)` | Диапазон от start + duration |
| `buildTaskRangeFromEnd(endDate, duration, businessDays?, weekendPredicate?)` | Диапазон от end - duration |
| `moveTaskRange(originalStart, originalEnd, proposedStart, ...)` | Перемещение с сохранением длительности |
| `clampTaskRangeForIncomingFS(task, proposedStart, proposedEnd, allTasks, ...)` | Ограничение по входящим FS-связям |
| `recalculateIncomingLags(task, newStart, newEnd, allTasks, ...)` | Пересчёт lag после изменения дат |
| `resolveDateRangeFromPixels(mode, left, width, monthStart, dayWidth, task, ...)` | Конвертация пикселей в даты (из drag) |
| `clampDateRangeForIncomingFS(task, range, allTasks, mode, ...)` | Ограничение range по FS-связям (из drag) |

### validation.ts

| Функция | Описание |
|---|---|
| `buildAdjacencyList(tasks)` | Map predecessor → successors |
| `detectCycles(tasks)` | Обнаружение циклов в графе |
| `validateDependencies(tasks)` | Полная валидация: циклы, missing tasks, иерархия |

### hierarchy.ts

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

## Гарантии

- Ноль `import ... from 'react'` в core/scheduling
- Ноль `import ... from 'date-fns'` в core/scheduling
- Ноль обращений к `document.*` или DOM API
- Все функции — чистые, без побочных эффектов
- Все существующие тесты проходят через backward-compat re-export цепочку

---

[← Back to API Reference](./INDEX.md)

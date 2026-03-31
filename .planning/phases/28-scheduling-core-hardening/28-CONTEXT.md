# Phase 28: Scheduling Core Hardening — CONTEXT

## Цель фазы

Сделать `gantt-lib/core/scheduling` полноценным server-ready headless core:
- отделить domain scheduling от UI adapter слоя
- дать стабильный command-level API для downstream-потребителей
- документировать так, чтобы сервер мог воспроизводить поведение без чтения UI-кода

## Текущее состояние (после Phase 27)

Структура `packages/gantt-lib/src/core/scheduling/`:
- `types.ts` — реэкспорт `Task`, `LinkType`, `TaskDependency`, etc. из `../../types`
- `dateMath.ts` — чистая дата-математика (normalizeUTCDate, parseDateOnly, бизнес-дни)
- `dependencies.ts` — calculateSuccessorDate, normalizeDependencyLag, computeLagFromDates
- `cascade.ts` — cascadeByLinks, universalCascade, getSuccessorChain, getTransitiveCascadeChain, reflowTasksOnModeSwitch
- `commands.ts` — moveTaskRange, buildTaskRangeFromStart/End, clampTaskRangeForIncomingFS, recalculateIncomingLags + **resolveDateRangeFromPixels, clampDateRangeForIncomingFS**
- `validation.ts` — detectCycles, validateDependencies, buildAdjacencyList
- `hierarchy.ts` — getChildren, isTaskParent, computeParentDates, computeParentProgress, getAllDescendants, getAllDependencyEdges, removeDependenciesBetweenTasks
- `index.ts` — barrel re-export всего

`dependencyUtils.ts` — тонкий re-export barrel (ноль реализаций).

## Проблемы (из PRD)

### P1: UI-функции в domain core
В `commands.ts` находятся функции, выраженные в терминах UI interaction:
- `resolveDateRangeFromPixels(...)` — принимает `left`, `width`, `dayWidth`, `monthStart` (пиксели и chart coordinates)
- `clampDateRangeForIncomingFS(...)` — drag-specific helper (обёртка над domain-функцией, но принимает `mode: 'move' | 'resize-left' | 'resize-right'`)

Эти функции нужно вынести в UI adapter layer.

### P2: Нет command-level API
Downstream вынужден комбинировать `moveTaskRange + universalCascade + parent recompute` вручную. Нужны высокоуровневые команды:
- `moveTaskWithCascade(...)`
- `resizeTaskWithCascade(...)`
- `recalculateTaskFromDependencies(...)`
- `recalculateProjectSchedule(...)` (snapshot-wide entry point)

### P3: Две линии поведения не разделены явно
- cascade/constraint execution (universalCascade, cascadeByLinks)
- explicit lag recomputation (recalculateIncomingLags)

Обе нужно сохранить, но явно разделить и документировать.

### P4: Типы тащат presentation-поля
`types.ts` реэкспортит общий `Task` из `../../types`. Для server-ready boundary нужны минимальные domain-типы:
- `ScheduleTask` (минимальный shape для scheduling)
- `ScheduleDependency`
- `ScheduleTaskUpdate`
- `ScheduleCommandResult`

### P5: Документация расходится с кодом
`docs/reference/14-headless-scheduling.md`:
- не описывает семантику `normalizeDependencyLag` для FS negative lag
- не описывает, что делает `cascadeByLinks` по типам связей
- `resolveDateRangeFromPixels` описана как часть core (а это UI adapter)
- нет command-level API

### P6: Нет downstream consumption contract
Нет формального документа: как серверу использовать модуль, что считать authoritative, минимальный task shape.

## Функциональные требования

### FR-1: Разделение domain core и UI adapters
- Вынести из core/scheduling: resolveDateRangeFromPixels, clampDateRangeForIncomingFS
- Новое место: src/core/scheduling-adapters/ или src/adapters/scheduling/
- Domain core не знает о пикселях, drag handles, chart coordinates

### FR-2: Command-level API
- moveTaskWithCascade(taskId, newStart, snapshot, options) → { changedTasks, changedIds }
- resizeTaskWithCascade(taskId, anchor, newDate, snapshot, options) → { changedTasks, changedIds }
- recalculateTaskFromDependencies(taskId, snapshot, options) → result
- recalculateProjectSchedule(snapshot, options) → full recomputed state

### FR-3: Явное разделение logic families
- cascade vs lag-recompute задокументированы отдельно
- recalculateIncomingLags = edit-policy helper, не часть cascade flow

### FR-4: Domain-типы для downstream
- ScheduleTask (минимальный shape: id, startDate, endDate, dependencies?, parentId?, locked?, progress?)
- ScheduleDependency (type, taskId, lag?)
- ScheduleTaskUpdate
- ScheduleCommandResult (changedTasks, changedIds)

### FR-5: Документация
- Исправить 14-headless-scheduling.md: normalizeDependencyLag FS negative lag, cascadeByLinks по типам связей
- Отметить domain vs adapter разделение
- Описать command-level API
- Обозначить stability level

### FR-6: Downstream consumption contract
- Recommended import path
- Stable entry points
- Minimal required task shape
- Authoritative behavior
- Что можно копировать verbatim

## Требования к тестам

1. **Parity tests**: command APIs preserve current behavior (FS/SS/FF/SF, negative FS lag, business-day cascade, parent+children, lag recalculation)
2. **Boundary tests**: domain core работает в pure Node (no React, no DOM)
3. **Public contract tests**: export map для CJS/ESM, command-level API экспортируется, backward-compat работает

## Acceptance Criteria

- `gantt-lib/core/scheduling` — clear server-ready domain API
- Pixel-based drag conversion НЕ часть domain boundary
- Downstream consumer может execute task move/resize/cascade без manual helper composition
- Documentation matches real code semantics
- Existing library behavior unchanged
- Headless scheduling работает из Node без UI baggage

## Технические ограничения

- НЕ менять scheduling-логику без явного запроса
- НЕ переписывать dependency semantics
- НЕ заменять текущую модель startDate/endDate
- НЕ навязывать серверу продуктовые решения
- Preserve behavior first, improve boundaries second
- Prefer explicit command wrappers over asking downstream to compose helpers

# PRD: Headless Scheduling Core Hardening for `gantt-lib`

## Context

В `gantt-lib` уже выделен headless scheduling module в `src/core/scheduling`, и это правильный шаг. Но в текущем состоянии boundary ещё не идеален для downstream-использования на сервере.

Сейчас модуль решает две разные задачи одновременно:

- хранит чистую scheduling/domain-логику
- частично хранит UI-adapter логику drag/edit сценариев

Из-за этого downstream-репо, например `gantt-lib-mcp`, всё ещё вынуждено додумывать, какие функции являются domain truth, а какие относятся только к браузерному UX. Кроме того, документация местами описывает семантику неточно относительно реального кода.

Главный принцип этого PRD:

- не менять текущую scheduling-логику библиотеки без явного запроса
- довести extraction до такого состояния, чтобы `gantt-lib` был надёжным источником scheduling semantics для сервера
- сделать boundary decision-complete для downstream reuse

## Product Goal

Сделать `gantt-lib/core/scheduling` полноценным server-ready headless core, который:

- сохраняет текущую логику библиотеки
- отделяет domain scheduling от UI adapter слоя
- даёт стабильный command-level API для downstream-потребителей
- документирован так, чтобы сервер мог воспроизводить поведение без чтения внутренностей UI-кода

Успех означает:

- downstream-репо может использовать core без React, DOM, пикселей, drag state и chart-specific координат
- в core есть один ясный уровень “высокоуровневых scheduling-команд”, а не только набор низкоуровневых helper-ов
- documentation совпадает с реальной семантикой кода
- `gantt-lib-mcp` может либо импортировать этот core, либо дублировать его без потери смысла

## Non-Goals

- не переписывать dependency semantics
- не заменять текущую модель `startDate/endDate`
- не навязывать серверу продуктовые решения, которых ещё нет в библиотеке
- не делать полный public API redesign всего `gantt-lib`
- не убирать из библиотеки текущие lag-recompute сценарии, если они нужны существующему UI

## Problems To Solve

1. В headless core уже попали UI-shaped функции, например `pixels -> date range`, что размывает границу между domain и presentation.
2. Downstream-проекту всё ещё приходится склеивать scheduling behavior из нескольких helper-ов вручную.
3. Документация на headless scheduling местами расходится с фактической семантикой кода.
4. Типовой API core ориентирован на внутренние утилиты, а не на реальные mutation intents сервера.
5. Нет формального contract layer, который можно считать authoritative scheduling API.

## Target Outcome

После выполнения этого PRD структура должна явно разделяться на три слоя:

### 1. Domain scheduling core

Чистая runtime-agnostic scheduling логика:

- date math
- duration math
- dependency semantics
- hierarchy semantics
- validation
- cascade engine
- schedule command execution

### 2. UI adapter layer

Логика, которая переводит browser interaction в domain commands:

- pixels to dates
- drag mode translation
- resize handle interpretation
- preview-specific conversion helpers

### 3. Compatibility layer

Backward-compatible re-exports и adapter helpers для существующего `gantt-lib` API.

## Functional Requirements

### 1. Separate domain core from UI adapters

Из `src/core/scheduling` должны быть убраны функции, которые выражены в терминах UI interaction, а не schedule domain.

Из headless domain core нужно вынести в UI adapter layer:

- `resolveDateRangeFromPixels(...)`
- `clampDateRangeForIncomingFS(...)` если она используется как drag-specific helper
- любые будущие функции, принимающие `left`, `width`, `dayWidth`, chart mode, viewport-like данные

Их новое место:

- `src/core/ui-adapters/scheduling/` или
- `src/adapters/scheduling/` внутри пакета

Требование:

- domain core принимает только task graph, dates, durations, dependencies, calendars, hierarchy metadata
- domain core не знает о пикселях, drag handles, chart coordinates

### 2. Add command-level scheduling API

Поверх существующих helper-ов нужно ввести один стабильный уровень API, который выражает mutation intent.

Минимальный command surface:

- `moveTaskWithCascade(...)`
- `resizeTaskWithCascade(...)`
- `recalculateTaskFromDependencies(...)`
- `recalculateProjectSchedule(...)` или эквивалентный snapshot-wide entry point

Требования к этим API:

- вход только в терминах дат и task graph
- выход содержит итоговые updated tasks и changed task ids
- поведение полностью основано на текущей логике `gantt-lib`
- downstream consumer не должен вручную комбинировать `moveTaskRange + universalCascade + parent recompute`

### 3. Keep both existing logic families explicit

Сейчас в библиотеке фактически существуют две разные линии поведения:

- cascade/constraint execution
- explicit lag recomputation from edited dates

Обе нужно сохранить, но сделать явными и отдельно названными.

Требование:

- command API для schedule moves не должен неявно смешиваться с lag-recompute helpers
- `recalculateIncomingLags(...)` должен быть задокументирован как отдельный edit-policy helper, а не как часть обязательного каскадного move flow
- документация должна объяснять, где используется cascade, а где lag recomputation

### 4. Tighten type boundary for downstream consumers

Сейчас core type gateway реэкспортит общий `Task` тип библиотеки. Это допустимо для совместимости, но для server-ready boundary желательно ввести domain-oriented типы scheduling-слоя.

Добавить отдельные типы:

- `ScheduleTask`
- `ScheduleDependency`
- `ScheduleTaskUpdate`
- `ScheduleCommandResult`
- `ScheduleConflict` если требуется

Требования:

- типы должны быть минимальными и не тащить лишние presentation-поля как обязательные
- compatibility adapters могут продолжать принимать текущий `Task`
- downstream-репо должно понимать, какой минимальный shape нужен для headless scheduling

### 5. Make behavior documentation exact

Документация `docs/reference/14-headless-scheduling.md` должна быть приведена в полное соответствие с кодом.

Обязательные исправления:

- точно описать семантику `normalizeDependencyLag` для FS negative lag
- точно описать, что `cascadeByLinks(...)` делает по типам связей
- явно отметить, какие функции относятся к domain core, а какие к UI adapters
- отдельно описать command-level API после его добавления
- явно обозначить stability level API для downstream-использования

### 6. Define downstream consumption contract

Нужно формально задокументировать, как серверный потребитель должен использовать этот модуль.

Документация должна содержать:

- recommended import path
- stable entry points
- minimal required task shape
- что считается authoritative behavior
- что downstream может копировать verbatim, если не может импортировать пакет напрямую

## Technical Scope

### In Scope

- `src/core/scheduling/*`
- новый command-layer внутри scheduling core
- новый UI adapter layer для drag-specific conversion
- re-export strategy
- docs/reference for headless scheduling
- tests for parity and public semantics

### Out of Scope

- chart rendering
n- React component API redesign
- task list UI redesign
- visual drag preview redesign
- backend implementation in other repos

## Proposed Module Shape

### Domain core

- `src/core/scheduling/types.ts`
- `src/core/scheduling/dateMath.ts`
- `src/core/scheduling/dependencies.ts`
- `src/core/scheduling/hierarchy.ts`
- `src/core/scheduling/validation.ts`
- `src/core/scheduling/cascade.ts`
- `src/core/scheduling/commands.ts`
- `src/core/scheduling/execute.ts`

### UI adapter layer

- `src/core/scheduling-adapters/drag.ts`
- `src/core/scheduling-adapters/resize.ts`
- `src/core/scheduling-adapters/index.ts`

### Compatibility layer

- `src/utils/dependencyUtils.ts`
- existing public re-exports from package root

Exact filenames may differ, but the split between domain core and UI adapters must be explicit.

## API Requirements

### Required domain-level commands

Each command should operate on a full task snapshot or a clearly bounded subset.

#### `moveTaskWithCascade`

Input:

- task id
- new start date or delta
- task snapshot
- day mode options

Output:

- changed tasks
- updated ranges
- optional patch list

#### `resizeTaskWithCascade`

Input:

- task id
- resize anchor (`start` or `end`)
- new date
- task snapshot
- day mode options

Output:

- changed tasks
- updated ranges
- optional patch list

#### `recalculateTaskFromDependencies`

Input:

- task id
- task snapshot
- day mode options

Output:

- recomputed range for target and dependents if required

#### `recalculateProjectSchedule`

Input:

- full task snapshot
- day mode options

Output:

- normalized/recomputed project state

## Backward Compatibility Requirements

- Existing imports from `gantt-lib` root must keep working.
- Existing internal UI code should continue functioning after rewiring to new layers.
- Existing test coverage should remain green.
- `dependencyUtils.ts` may remain as a compatibility barrel, but must not be the authoritative design surface for downstream consumers.

## Documentation Requirements

Produce or update the following docs:

- `docs/reference/14-headless-scheduling.md` as exact API reference
- one short downstream guide for server consumers
- changelog entry describing headless scheduling stabilization

Documentation must explicitly distinguish:

- stable public core API
- compatibility re-exports
- internal-only helpers
- UI adapter helpers

## Testing Requirements

### 1. Parity tests

Add tests that prove extracted command APIs preserve current behavior.

Required scenarios:

- move predecessor with FS, SS, FF, SF successors
- negative FS lag behavior
- business-day cascade
- parent move with children
- parent recompute from children
- explicit lag recalculation path remains unchanged

### 2. Boundary tests

Add tests that prove domain core is UI-free.

Examples:

- command APIs can run in pure Node environment
- no React imports required to execute scheduling commands
- no DOM globals required

### 3. Public contract tests

Add tests for the new `core/scheduling` entry point:

- export map works for CJS and ESM
- command-level APIs are exported
- compatibility root imports still resolve

## Acceptance Criteria

- `gantt-lib/core/scheduling` exposes a clear server-ready domain API.
- Pixel-based drag conversion is no longer part of the domain scheduling boundary.
- Downstream consumer can execute task move/resize/cascade without manually composing low-level helpers.
- Documentation matches real code semantics.
- Existing library behavior remains unchanged for current consumers.
- Headless scheduling can be consumed from Node without UI baggage.

## Risks

- Some existing UI flows may rely on helper placement rather than behavior; moving helpers into adapter modules can break imports if compatibility re-exports are missed.
- If command APIs are added as thin wrappers but not clearly documented as authoritative, downstream repos will continue bypassing them.
- If documentation is not corrected together with the code, server implementations may encode the wrong semantics.

## Implementation Rules

- Preserve behavior first, improve boundaries second.
- Do not silently change scheduling semantics under the extraction umbrella.
- Prefer adding explicit command wrappers over asking downstream repos to compose helpers.
- Keep browser interaction math outside the domain core.
- Treat `core/scheduling` as the future authoritative scheduling surface for backend reuse.

# Phase 23: Additional TaskList Columns - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Добавить в `gantt-lib` механизм кастомных колонок для TaskList, чтобы приложение могло подключать собственные доменные поля без изменений ядра библиотеки. Библиотека отвечает за каркас таблицы, рендер строк, открытие редакторов и интеграцию с текущим lifecycle TaskList, но не должна знать конкретные бизнес-сущности вроде бригад, зон, объёмов или стоимости.

</domain>

<decisions>
## Implementation Decisions

### Архитектурный принцип
- **D-01:** Кастомные колонки существуют как внешний конфиг приложения, а не как зашитые поля библиотеки.
- **D-02:** `gantt-lib` не моделирует доменную структуру данных. Она знает только строку задачи и правила колонки для рендера/редактирования.
- **D-03:** Библиотека предоставляет общий механизм колонок, а приложение определяет конкретные поля, вычисления и бизнес-смысл.

### API формы
- **D-04:** В этой фазе используется расширяющий API `additionalColumns`, а не полный единый `columns`.
- **D-05:** Базовые системные колонки остаются встроенными и продолжают работать как сейчас.
- **D-06:** Кастомные колонки добавляются после системных колонок; произвольная перестановка всех колонок не входит в scope этой фазы.

### Column config model
- **D-07:** Каждая кастомная колонка описывается объектом-конфигом с устойчивым `id`, заголовком, шириной и функциями рендера.
- **D-08:** Для колонки нужен механизм display/editable/computed/service через конфиг, а не через отдельные типы компонентов библиотеки.
- **D-09:** Колонка может иметь как минимум `renderCell`, опциональный `renderEditor`, а также декларативное `meta` для доменных пометок.

### Типизация и DX
- **D-10:** API колонок должен быть generic по типу задачи, чтобы приложение могло типобезопасно передавать расширенный task с доменными полями.
- **D-11:** Рендереры и редакторы колонок должны получать расширенный task напрямую, без ручных `as MyTask` cast в пользовательском коде.

### Editing pipeline
- **D-12:** Если custom editor меняет значение, библиотека принимает patch, мержит его в текущий task и использует существующий `onTasksChange` pipeline.
- **D-13:** Отдельный callback уровня колонки для сохранения изменений в этой фазе не нужен.
- **D-14:** Inline-edit lifecycle для кастомных колонок должен по возможности совпадать с текущим паттерном TaskList: открыть ячейку, отрендерить editor, затем сохранить через существующий update flow.

### Meta semantics
- **D-15:** `meta` в этой фазе только декларативная. Она описывает смысл колонки вроде `affectsSchedule`, но сама по себе не запускает встроенную доменную логику библиотеки.
- **D-16:** Реакция на `meta` может появиться позже, но не должна блокировать первую реализацию механизма колонок.

### the agent's Discretion
- Выбор итогового имени публичного типа колонки (`GanttColumn`, `TaskListColumn` или совместимый вариант), если смысл и форма API сохраняются
- Точный набор обязательных и опциональных полей конфига сверх уже зафиксированных
- Технический способ активации editor для custom cell внутри текущей структуры `TaskListRow`
- Поведение special rows, если оно не меняет архитектурные решения выше

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Требования и roadmap
- `.planning/ROADMAP.md` — официальная граница Phase 23 и текущий milestone context
- `.planning/REQUIREMENTS.md` — требования `COL-01` ... `COL-08` для additional columns
- `.planning/PROJECT.md` — продуктовый принцип: extensibility features without embedding product-specific logic

### Существующий TaskList API и integration points
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` — публичный API `GanttChart`, текущий `onTasksChange` pipeline, wiring `TaskList`
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` — структура системных колонок, header/body layout, integration point for `additionalColumns`
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — текущий inline editing lifecycle, cell rendering patterns, row behaviors
- `packages/gantt-lib/src/components/TaskList/TaskList.css` — текущая сетка ширин, hover/edit affordances, overflow behavior
- `packages/gantt-lib/src/index.ts` — публичные экспорты библиотеки; сюда должен выйти новый API колонок

### Типы и существующие решения
- `packages/gantt-lib/src/types/index.ts` — базовые типы task/dependency, точка для оценки generic strategy
- `.planning/phases/12-task-list/12-CONTEXT.md` — исходные решения по TaskList overlay и inline editing
- `.planning/phases/17-action-buttons-panel/17-CONTEXT.md` — решения о встроенных системных action cells
- `.planning/phases/22-filters/22-CONTEXT.md` — текущий pattern extensibility without breaking dependencies and filtering

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TaskList.tsx`: уже содержит централизованный header/body layout и routing всех row props
- `TaskListRow.tsx`: уже реализует inline editing для имени, дат, duration и progress, что можно использовать как reference pattern для custom editors
- `GanttChart.tsx`: уже инкапсулирует merge/cascade behavior через единый `handleTaskChange`
- `src/index.ts`: уже служит единой точкой публичного экспорта новых API

### Established Patterns
- TaskList остаётся overlay слева и живёт в одном scroll content с chart
- Изменения задач идут через `onTasksChange` и передают только изменённые полные task objects
- Системные колонки и сложные behaviors сейчас собраны вокруг `TaskList` + `TaskListRow`, а не вынесены в универсальную table abstraction
- Встроенные UX patterns уже есть: click-to-edit, blur/Enter save, Esc cancel, hover-reveal controls

### Integration Points
- `GanttChartProps`: сюда нужно добавить новый публичный prop для `additionalColumns`
- `TaskListProps`: сюда нужно пробросить конфиг колонок вниз
- `TaskList` header/body rendering: сюда нужно встроить рендер дополнительных header/cell блоков справа от системных колонок
- `TaskListRow`: сюда нужно встроить custom cell rendering/editor activation без поломки hierarchy, filters, dependencies, add/delete, progress и date editing

</code_context>

<specifics>
## Specific Ideas

- Ключевой продуктовый принцип: "не зашивать бизнес-логику в gantt-lib"
- Примеры доменных колонок, которые должны жить вне ядра: бригада, зона, объём, стоимость, поставка, ответственный
- Возможные режимы колонок: информационные, редактируемые, вычисляемые, служебные/доменные
- Предпочтительный developer experience: приложение описывает массив колонок и передаёт его в `<Gantt />`
- Предпочтительная форма обновления из editor: `onChange(patch)` с последующим merge в текущий task и использованием стандартного update flow

</specifics>

<deferred>
## Deferred Ideas

- Полный единый API `columns`, где системные колонки тоже описываются конфигом
- Произвольная перестановка всех колонок, включая системные
- Встроенная реакция библиотеки на `meta.affectsSchedule`, `meta.affectsResources` и похожие флаги
- Отдельный column-level persistence/update pipeline вне `onTasksChange`

</deferred>

---

*Phase: 23-additional-tasklist-columns*
*Context gathered: 2026-03-27*

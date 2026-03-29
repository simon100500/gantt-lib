# Phase 25: columns-refactoring - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Source:** PRD Express Path (.planning/phases/23-additional-tasklist-columns/23-REFRACTOR-PRD.md)

<domain>
## Phase Boundary

Рефакторинг системы колонок TaskList: объединение built-in и custom колонок в единый pipeline с одним контрактом, одним resolver'ом, одним render path'ом, одним editor lifecycle и числовой моделью ширины. Полное сохранение generic типизации `TTask` через всю цепочку.

</domain>

<decisions>
## Implementation Decisions

### Column Contract
- Единый интерфейс `TaskListColumn<TTask>` для built-in и custom колонок
- `width` только числовой (px), без строковых CSS значений
- `renderEditor` вместо `editor` для ясности назначения
- `editable` опциональное поле для декларативной ясности
- `before`/`after` anchoring для позиционирования относительно любой колонки (built-in или custom)
- `updateTask` типизирован как `Partial<TTask>`

### Column Resolution
- Built-in base order: number → name → startDate → endDate → duration → progress → dependencies → actions
- Custom колонки обрабатываются в порядке предоставления consumer'ом
- `after` anchor: вставка сразу после указанной колонки
- `before` anchor: вставка сразу перед указанной колонкой
- Без anchor → вставка после `name`
- Невалидный anchor → fallback после `name`
- Дупликаты id: предсказуемый fail в dev, документированное поведение в prod
- Single-pass insertion strategy, без graph-based ordering

### Rendering Model
- Header и body рендерятся из одного `resolvedColumns` массива
- Каждая строка итерирует `resolvedColumns.map(column => ...)`
- Header рендерится аналогично: `resolvedColumns.map(column => ...)`

### Editor Lifecycle
- Один `editingColumnId` state на строку: `useState<string | null>(null)`
- Только один editor открыт на строку в один момент
- `openEditor()` / `closeEditor()` через column context
- `updateTask()` через `onTasksChange` с merged full task patch
- Built-in и custom колонки используют один механизм

### Width Model
- Только числовые ширины (px)
- Total width = сумма resolved column widths
- `effectiveTaskListWidth = max(requestedTaskListWidth, resolvedColumnWidthTotal)`
- Нет парсинга CSS строк

### Generic Flow
- Generics сохраняются через всю цепочку: `GanttChart<TTask>` → `TaskList<TTask>` → `TaskListRow<TTask>` → `TaskListColumn<TTask>` → `TaskListColumnContext<TTask>`
- Нет сужения до base `Task` кроме случаев legacy утилит (конверсия остаётся локальной)
- Публичный API не требует `as TaskListColumn<Task>[]` кастов

### File Structure
- `columns/types.ts` — shared column types
- `columns/createBuiltInColumns.tsx` — factory для built-in column declarations
- `columns/resolveTaskListColumns.ts` — pure resolver для финального порядка колонок
- `TaskList.tsx` — resolve columns + render header/body containers
- `TaskListRow.tsx` — render row по resolved columns, row-level editor state
- `TaskListCell.tsx` — optional wrapper для per-cell editor/render behavior
- `cells/*` — extracted built-in cell implementations для сложных ячеек

### Migration Strategy (Phase Order)
- Phase A: Structural Foundations (types, resolver с тестами, built-in column factory)
- Phase B: Render Unification (header → resolvedColumns, row → resolvedColumns)
- Phase C: Editor Unification (единый editingColumnId, shared editor model)
- Phase D: Generic Tightening (generic TaskList/TaskListRow, убрать `as Task` касты)
- Phase E: Cleanup (dead code, obsolete width helpers, документация API)

### Claude's Discretion
- Конкретная реализация `TaskListCell.tsx` wrapper'а (может быть optional)
- Extraction strategy для сложных built-in cell implementations в `cells/*`
- Внутренняя организация тестов (файловая структура, test utilities)
- Детали memoization для resolved columns
- Порядок рефакторинга конкретных built-in editable колонок в Phase C

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current Implementation
- `packages/gantt-lib/src/components/TaskList/TaskList.tsx` — текущий TaskList с hardcoded custom column insertion
- `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx` — текущий TaskListRow с дублированным custom column rendering
- `packages/gantt-lib/src/types/taskListColumns.ts` — текущие типы колонок
- `packages/gantt-lib/src/components/GanttChart.tsx` — GanttChart generic props и column passing

### Phase 23 (Current Column Implementation)
- `.planning/phases/23-additional-tasklist-columns/23-REFRACTOR-PRD.md` — PRD с полными требованиями рефакторинга
- `.planning/phases/23-additional-tasklist-columns/` — планы и контекст исходной реализации колонок

</canonical_refs>

<specifics>
## Specific Ideas

### Proposed API (from PRD Section 8)
```ts
export type BuiltInTaskListColumnId =
  | 'number' | 'name' | 'startDate' | 'endDate'
  | 'duration' | 'progress' | 'dependencies' | 'actions';

export type TaskListColumnAnchor =
  | { after: BuiltInTaskListColumnId | string }
  | { before: BuiltInTaskListColumnId | string }
  | {};

export interface TaskListColumnContext<TTask extends Task> {
  task: TTask;
  rowIndex: number;
  isEditing: boolean;
  openEditor: () => void;
  closeEditor: () => void;
  updateTask: (patch: Partial<TTask>) => void;
}

export interface TaskListColumn<TTask extends Task> extends TaskListColumnAnchor {
  id: string;
  header: React.ReactNode;
  width?: number;
  minWidth?: number;
  editable?: boolean;
  renderCell: (ctx: TaskListColumnContext<TTask>) => React.ReactNode;
  renderEditor?: (ctx: TaskListColumnContext<TTask>) => React.ReactNode;
  meta?: Record<string, unknown>;
}
```

### Test Plan (from PRD Section 16)
- Resolver: insert after/before any anchor, preserve order, fallback on missing anchors, handle duplicate ids
- Rendering: header/body matching order, custom columns in resolved positions, width grows correctly
- Editing: custom editor open/close, merged task updates, single-editor-per-row, `updateTask` preserves TTask fields
- Type-level: extended task type compiles without casts

</specifics>

<deferred>
## Deferred Ideas

- Hide/show columns API
- User-driven column ordering (drag-to-reorder)
- Resizable columns
- Persistent column preferences
- Virtualization optimization
- Full plugin framework for columns
- Advanced layout engine (CSS grid templates)
- Support for arbitrary string width parsing

</deferred>

---

*Phase: 25-columns-refactoring*
*Context gathered: 2026-03-29 via PRD Express Path*

# Phase 23: Additional TaskList Columns - Research

**Researched:** 2026-03-27
**Domain:** Extensible TaskList column architecture for `gantt-lib`
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Claude's Discretion
- Выбор итогового имени публичного типа колонки (`GanttColumn`, `TaskListColumn` или совместимый вариант), если смысл и форма API сохраняются
- Точный набор обязательных и опциональных полей конфига сверх уже зафиксированных
- Технический способ активации editor для custom cell внутри текущей структуры `TaskListRow`
- Поведение special rows, если оно не меняет архитектурные решения выше

### Deferred Ideas (OUT OF SCOPE)
- Полный единый API `columns`, где системные колонки тоже описываются конфигом
- Произвольная перестановка всех колонок, включая системные
- Встроенная реакция библиотеки на `meta.affectsSchedule`, `meta.affectsResources` и похожие флаги
- Отдельный column-level persistence/update pipeline вне `onTasksChange`
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COL-01 | User can pass `additionalColumns?: Column[]` prop to TaskList | Add a public `additionalColumns` prop on `GanttChart` and thread it through `TaskList` and `TaskListRow`. |
| COL-02 | Column interface includes `id`, `header`, `renderCell`, optional `editor`, `width`, `after` | Define one config type for custom columns plus a row-context type for renderers/editors. |
| COL-03 | `renderCell: (row: GanttRow) => ReactNode` renders cell content for each row | Render additional cells from an ordered column descriptor list inside each `TaskListRow`. |
| COL-04 | `editor?: (row: GanttRow) => ReactNode` provides inline editor component | Track active custom cell per row and expose patch/close helpers via row context. |
| COL-05 | `after?: string` positions column after specified base column (default: after 'Name') | Resolve `after` only against known built-in anchors; preserve input order within each anchor bucket. |
| COL-06 | Base columns remain: №, Name, Dates, Dependencies, Actions | Keep current built-in cells hard-coded; only splice custom columns between anchor points. |
| COL-07 | Additional columns render inline, scroll with TaskList | Extend current flex row/header layout and widen overlay width budget instead of introducing nested scroll containers. |
| COL-08 | Column width is customizable via `width?: string \| number` | Normalize width to CSS values and apply consistently to header and body cells. |
</phase_requirements>

## Summary

This phase fits the existing `TaskList` architecture without a table rewrite. The current implementation already has one horizontal scroll container, a sticky overlay, flex-based header/body rows, and a stable update pipeline through `GanttChart.handleTaskChange`. The safest plan is to keep all built-in columns hard-coded and insert custom columns through a config-driven extension layer at predefined anchor points.

The main technical work is not rendering arbitrary React nodes. It is preserving three invariants: type-safe access to app-specific task fields, editor changes flowing through the current `onTasksChange` merge path, and width/layout staying synchronized between header, body rows, filtering, hierarchy, and sticky overlay behavior. The repo already provides the right seams for this in [`GanttChart.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx), [`TaskList.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.tsx), and [`TaskListRow.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx).

**Primary recommendation:** Implement `additionalColumns` as a generic, config-driven overlay extension over the existing built-in TaskList columns; do not convert TaskList to a universal table abstraction in this phase.

## Project Constraints (from CLAUDE.md)

- Respond in Russian when talking to the user.
- Keep recommendations decisive; avoid broad option matrices.
- Default to working code and action-oriented output.
- Respect explicit user preferences and avoid pushing alternate approaches once rejected.
- Follow instructions precisely and avoid assumption-heavy scope expansion.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | `^19.0.0` in repo dev deps, peer `>=18` | Render prop-based custom cells/editors | Already used across `gantt-lib`; `ReactNode` renderers fit the requested API naturally. |
| TypeScript | `^5.7.0` | Generic column API and typed patch flow | Needed to make `additionalColumns` generic over extended task types. |
| Existing TaskList flex/CSS overlay | repo-native | Header/body alignment and sticky left panel | Current TaskList already scrolls correctly with the chart; extending it is lower risk than replacing it. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `^3.0.0` | Component and interaction tests | Use for column ordering, editor activation, and width rendering coverage. |
| Testing Library React | `^16.3.2` | DOM-level interaction tests | Use for click-to-edit and renderer/editor assertions. |
| Radix Popover wrapper | `@radix-ui/react-popover ^1.1.15` | Existing inline popovers in TaskList | Reuse only if a custom editor needs portal/popover behavior; phase does not require a new dependency. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in columns + `additionalColumns` extension layer | Full unified `columns` API | Larger refactor, contradicts deferred scope, higher regression risk for base columns. |
| Current flex row/header layout | CSS Grid or table abstraction rewrite | Harder migration, more layout regression risk, no requirement benefit in this phase. |
| Existing `onTasksChange` merge flow | Per-column save callbacks | Conflicts with locked decision D-13 and duplicates persistence logic. |

**Installation:**
```bash
# No new packages recommended for this phase
```

**Version verification:** Versions above are taken from [`packages/gantt-lib/package.json`](D:/Projects/gantt-lib/packages/gantt-lib/package.json). No new external package is needed, so registry verification is not required for planning this phase.

## Architecture Patterns

### Recommended Project Structure
```text
packages/gantt-lib/src/
├── components/
│   ├── GanttChart/          # public prop wiring for additionalColumns
│   └── TaskList/            # header/body ordering, row rendering, editor activation
├── types/                   # shared public column/row context types
└── index.ts                 # public exports
```

### Pattern 1: Generic task threading from `GanttChart` down
**What:** Make the column API generic over the task type so app-specific fields stay strongly typed.
**When to use:** Immediately, at the public API boundary.
**Example:**
```ts
export interface TaskListColumnContext<TTask extends Task = Task> {
  task: TTask;
  rowIndex: number;
  isEditing: boolean;
  updateTask: (patch: Partial<TTask>) => void;
  closeEditor: () => void;
}

export interface TaskListColumn<TTask extends Task = Task> {
  id: string;
  header: React.ReactNode;
  renderCell: (row: TaskListColumnContext<TTask>) => React.ReactNode;
  editor?: (row: TaskListColumnContext<TTask>) => React.ReactNode;
  width?: string | number;
  after?: BuiltInTaskListColumnId;
  meta?: Record<string, unknown>;
}
```
**Source:** Existing typed public API pattern in [`GanttChart.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx) and [`index.ts`](D:/Projects/gantt-lib/packages/gantt-lib/src/index.ts)

### Pattern 2: Built-in anchors plus ordered custom buckets
**What:** Keep built-in columns explicit and splice additional columns after known anchor IDs.
**When to use:** In `TaskList.tsx` when rendering header cells and passing row column descriptors to `TaskListRow`.
**Example:**
```ts
const BUILT_IN_ANCHORS = ['number', 'name', 'startDate', 'endDate', 'duration', 'progress', 'dependencies', 'actions'] as const;

function groupColumnsByAnchor(columns: TaskListColumn[], fallback: BuiltInTaskListColumnId = 'name') {
  const buckets = new Map<BuiltInTaskListColumnId, TaskListColumn[]>();
  for (const anchor of BUILT_IN_ANCHORS) buckets.set(anchor, []);

  for (const column of columns) {
    const anchor = BUILT_IN_ANCHORS.includes(column.after as BuiltInTaskListColumnId)
      ? column.after as BuiltInTaskListColumnId
      : fallback;
    buckets.get(anchor)!.push(column);
  }

  return buckets;
}
```
**Source:** Current hard-coded header/body layout in [`TaskList.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.tsx)

### Pattern 3: Custom-cell editing should use task patch helpers, not direct persistence
**What:** The library should expose `updateTask(patch)` to custom editors and internally merge it into the row task before calling `onTasksChange`.
**When to use:** Inside `TaskListRow` for every custom editor.
**Example:**
```ts
const updateTask = (patch: Partial<TTask>) => {
  onTasksChange?.([{ ...task, ...patch }]);
  setEditingCustomColumnId(null);
};
```
**Source:** Existing row-level save pattern in [`TaskListRow.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx)

### Pattern 4: Width normalization must be shared by header and cells
**What:** Convert numeric widths to pixel strings once and reuse the same style in header and row cells.
**When to use:** For every additional column.
**Example:**
```ts
function toColumnWidth(width?: string | number): string | undefined {
  if (typeof width === 'number') return `${width}px`;
  return width;
}
```
**Source:** Current fixed-width cell model in [`TaskList.css`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css)

### Anti-Patterns to Avoid
- **Do not replace built-in columns with config objects in this phase:** That is a separate refactor and already deferred.
- **Do not add a second horizontal scrollbar inside TaskList:** The current overlay already scrolls with the main content.
- **Do not let custom editors call external persistence directly:** All changes should still land in `onTasksChange`.
- **Do not widen only the row cells:** Header and overlay width must grow in sync or alignment breaks immediately.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Task persistence for custom cells | Column-specific save callbacks or local store | Existing `onTasksChange` merge pipeline in `GanttChart` | Keeps dependency cascades, parent recomputation, and existing change semantics intact. |
| TaskList layout system | New table abstraction or nested scroll grid | Current sticky overlay + flex row structure | Current structure already satisfies scroll-sync and row alignment requirements. |
| Column positioning | Free-form drag reorder model | Fixed built-in anchors with `after` buckets | Meets COL-05 without opening full column management scope. |
| Editor lifecycle | Custom focus manager per column | Existing click -> editor -> blur/Enter -> save, Esc -> cancel pattern | Matches current TaskList behavior and test patterns. |

**Key insight:** The hard part here is preserving the invariants already encoded in TaskList. Extensibility should be a thin layer on top of that, not a second editing/rendering system.

## Common Pitfalls

### Pitfall 1: Losing type safety at the public API boundary
**What goes wrong:** `additionalColumns` ends up typed against base `Task`, so consumers must cast custom fields manually.
**Why it happens:** Current `GanttChartProps`, `TaskListProps`, and `TaskListRowProps` are not generic.
**How to avoid:** Thread `TTask extends Task` through the public and internal props touched by this phase.
**Warning signs:** Column examples require `task as MyTask`; editor patches lose field completion.

### Pitfall 2: Misreading `after` as full column reordering
**What goes wrong:** Implementation tries to support arbitrary reordering of built-in and custom columns.
**Why it happens:** `COL-05` mentions placement while context D-06 rejects full reorder scope.
**How to avoid:** Support `after` only as insertion after known built-in anchors; keep built-in order fixed.
**Warning signs:** Planner includes drag/drop columns, column registry for base cells, or a `columns` rewrite.

### Pitfall 3: Header/body width drift
**What goes wrong:** Custom cells render, but header titles and row cells no longer align or overflow breaks.
**Why it happens:** `TaskList` width is currently budgeted around fixed widths and `MIN_TASK_LIST_WIDTH = 530`.
**How to avoid:** Compute extra width contribution from custom columns and apply it to overlay width, header cells, and row cells together.
**Warning signs:** Sticky overlay clips columns, header shifts, or custom cells wrap unexpectedly.

### Pitfall 4: Editor clicks leaking into row selection and other handlers
**What goes wrong:** Clicking a custom editor also selects the row, closes the editor, or triggers unrelated row actions.
**Why it happens:** `TaskListRow` relies heavily on click bubbling and localized stop-propagation.
**How to avoid:** Wrap custom editor containers with the same stop-propagation discipline used by current built-in editors.
**Warning signs:** Editor opens and immediately closes; row selection toggles while typing.

### Pitfall 5: Breaking base columns while inserting custom ones
**What goes wrong:** Dependencies, action buttons, filters, or hierarchy affordances stop working after column insertion.
**Why it happens:** Built-in cells currently carry bespoke behavior and CSS classes.
**How to avoid:** Keep built-in cells intact; insert new cells around them instead of rewriting their render branches.
**Warning signs:** Missing dependency buttons, hierarchy toggle offsets, or lost hover actions in name/actions cells.

## Code Examples

Verified patterns from current repo:

### Public prop wiring through `GanttChart`
```ts
export interface GanttChartProps<TTask extends Task = Task> {
  tasks: TTask[];
  additionalColumns?: TaskListColumn<TTask>[];
  onTasksChange?: (tasks: TTask[]) => void;
}
```
**Source:** Existing prop threading pattern in [`GanttChart.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx)

### Row-level custom editor activation
```ts
const [editingCustomColumnId, setEditingCustomColumnId] = useState<string | null>(null);

const rowContext = {
  task,
  rowIndex,
  isEditing: editingCustomColumnId === column.id,
  updateTask: (patch: Partial<TTask>) => {
    onTasksChange?.([{ ...task, ...patch }]);
    setEditingCustomColumnId(null);
  },
  closeEditor: () => setEditingCustomColumnId(null),
};
```
**Source:** Existing inline editing state pattern in [`TaskListRow.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx)

### Width-normalized custom column cell
```ts
const width = toColumnWidth(column.width);
const style = width ? { width, minWidth: width, flexShrink: 0 } : undefined;

<div className="gantt-tl-headerCell gantt-tl-cell-custom" style={style}>
  {column.header}
</div>
```
**Source:** Existing fixed-width cell styling in [`TaskList.css`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hard-coded TaskList columns only | Hard-coded base columns plus config-driven `additionalColumns` extension layer | Planned for Phase 23 / v0.50.0 | Adds extensibility without refactoring existing system columns into metadata. |
| Built-in row editors only | Built-in editors plus custom editor slot that still emits task patches | Planned for Phase 23 / v0.50.0 | Keeps one save pipeline and avoids per-column persistence logic. |

**Deprecated/outdated:**
- Full unified `columns` API for both system and custom columns: explicitly deferred for a later phase.
- Arbitrary reordering of all columns: out of scope for this phase.

## Open Questions

1. **What exact anchor IDs should `after` accept?**
   - What we know: Requirements mention placement after a base column; built-in visible columns are №, Name, Start, End, Duration, Progress, Dependencies, Actions.
   - What's unclear: Whether public docs should expose display labels (`"Name"`) or stable IDs (`"name"`).
   - Recommendation: Use stable IDs in code (`'name'`, `'startDate'`, `'endDate'`, `'duration'`, `'progress'`, `'dependencies'`, `'actions'`) and document `'name'` as the default fallback.

2. **What should the public type names be?**
   - What we know: Context leaves naming to agent discretion.
   - What's unclear: Whether to export `TaskListColumn`, `GanttColumn`, or another alias.
   - Recommendation: Use `TaskListColumn` for the config and `TaskListColumnContext` for renderer/editor args; these names are the most local and least ambiguous.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^3.0.0` + Testing Library React `^16.3.2` |
| Config file | [`packages/gantt-lib/vitest.config.ts`](D:/Projects/gantt-lib/packages/gantt-lib/vitest.config.ts) |
| Quick run command | `npm run test -- --run src/__tests__/taskListColumns.test.tsx` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COL-01 | `additionalColumns` renders through public API | integration | `npm run test -- --run src/__tests__/taskListColumns.test.tsx` | ❌ Wave 0 |
| COL-02 | column config shape is honored | integration | `npm run test -- --run src/__tests__/taskListColumns.test.tsx` | ❌ Wave 0 |
| COL-03 | `renderCell` renders per row | integration | `npm run test -- --run src/__tests__/taskListColumns.test.tsx` | ❌ Wave 0 |
| COL-04 | custom editor opens on click and saves through patch flow | integration | `npm run test -- --run src/__tests__/taskListColumns.test.tsx` | ❌ Wave 0 |
| COL-05 | `after` ordering and default fallback work | unit/integration | `npm run test -- --run src/__tests__/taskListColumns.test.tsx` | ❌ Wave 0 |
| COL-06 | base columns still behave unchanged | regression integration | `npm run test -- --run src/__tests__/taskListColumns.test.tsx` | ❌ Wave 0 |
| COL-07 | extra columns stay in scrolling TaskList overlay | integration | `npm run test -- --run src/__tests__/taskListColumns.test.tsx` | ❌ Wave 0 |
| COL-08 | custom widths apply to header and cells | integration | `npm run test -- --run src/__tests__/taskListColumns.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- --run src/__tests__/taskListColumns.test.tsx`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/taskListColumns.test.tsx` — cover ordering, width, renderers, editor activation, and base-column regression checks
- [ ] Shared helpers for rendering `GanttChart` with custom columns if existing tests become repetitive

## Sources

### Primary (HIGH confidence)
- Repo source: [`packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/GanttChart/GanttChart.tsx) - public prop surface, `onTasksChange` flow, TaskList wiring
- Repo source: [`packages/gantt-lib/src/components/TaskList/TaskList.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.tsx) - hard-coded header/body layout, visible row rendering, width clamp
- Repo source: [`packages/gantt-lib/src/components/TaskList/TaskListRow.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskListRow.tsx) - inline editing lifecycle, row click behavior, memoization
- Repo source: [`packages/gantt-lib/src/components/TaskList/TaskList.css`](D:/Projects/gantt-lib/packages/gantt-lib/src/components/TaskList/TaskList.css) - overlay layout, column widths, sticky behavior
- Repo source: [`packages/gantt-lib/src/index.ts`](D:/Projects/gantt-lib/packages/gantt-lib/src/index.ts) - public exports
- Repo source: [`packages/gantt-lib/package.json`](D:/Projects/gantt-lib/packages/gantt-lib/package.json) - pinned stack versions and test scripts
- Phase context: [`23-CONTEXT.md`](D:/Projects/gantt-lib/.planning/phases/23-additional-tasklist-columns/23-CONTEXT.md) - locked decisions and deferred scope
- Historical context: [`12-CONTEXT.md`](D:/Projects/gantt-lib/.planning/phases/12-task-list/12-CONTEXT.md), [`17-CONTEXT.md`](D:/Projects/gantt-lib/.planning/phases/17-action-buttons-panel/17-CONTEXT.md), [`22-CONTEXT.md`](D:/Projects/gantt-lib/.planning/phases/22-filters/22-CONTEXT.md)
- Tests: [`taskFilter.test.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/__tests__/taskFilter.test.tsx), [`taskListDuration.test.tsx`](D:/Projects/gantt-lib/packages/gantt-lib/src/__tests__/taskListDuration.test.tsx)

### Secondary (MEDIUM confidence)
- None needed; this phase is governed primarily by current repo architecture and locked phase context.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new external stack is needed; versions and scripts are repo-pinned.
- Architecture: HIGH - Recommendations align directly with current TaskList/GanttChart implementation and locked context.
- Pitfalls: HIGH - Derived from current layout/editing structure and existing regression-sensitive areas.

**Research date:** 2026-03-27
**Valid until:** 2026-04-26

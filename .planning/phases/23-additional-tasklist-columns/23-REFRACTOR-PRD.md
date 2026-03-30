# PRD: TaskList Column System Refactor

**Date:** 2026-03-29  
**Status:** Proposed  
**Scope:** `packages/gantt-lib` TaskList / GanttChart column architecture  
**Related Phase:** 23-additional-tasklist-columns

## 1. Summary

The current custom column implementation works for the initial use case, but it is not a durable foundation for future growth. The current design:

- inserts custom columns only in hardcoded positions
- duplicates header/body/editor logic
- weakens generic typing internally through repeated casts
- calculates width budgets unreliably for non-numeric widths
- does not scale cleanly when more built-in anchors, editors, or column types are added

This refactor introduces one unified column system for TaskList. Built-in and custom columns will be resolved through the same pipeline, rendered through the same loop, and edited through the same row-level lifecycle.

The target state is intentionally simple:

- one column contract
- one resolver for final column order
- one resolved array used by both header and row rendering
- one editor lifecycle per row
- strong generic typing from `GanttChart<TTask>` down to cell/editor context
- deterministic width calculation using numeric widths only

This should make the feature easy to maintain, predictable to extend, and safe to scale.

## 2. Problem Statement

The current implementation has several structural problems:

1. Custom columns are only rendered after `name` and `progress`, even though the public API implies broader anchoring support.
2. Header rendering and row rendering each contain separate hardcoded insertion points.
3. Custom editor lifecycle is implemented as a custom path rather than as part of the main column model.
4. Internal generics are erased to base `Task` in multiple places, making the public API stronger than the implementation.
5. Width handling is inconsistent because string widths cannot be budgeted reliably.
6. Adding a new built-in insertion point or making built-in columns configurable would require manual edits across multiple files.

This makes the current solution acceptable as a feature prototype, but fragile as a long-term API.

## 3. Goals

- Provide a single declarative column model for both built-in and custom TaskList columns.
- Make custom column placement predictable and fully supported by implementation.
- Preserve strong typing for extended task shapes from `GanttChart<TTask>` through custom cell/editor callbacks.
- Keep the runtime model simple and deterministic.
- Reduce duplication in `TaskList` and `TaskListRow`.
- Make future features such as column hiding, reordering, or additional built-in anchors easier to add.

## 4. Non-Goals

- No full plugin framework for columns.
- No drag-to-reorder columns in this phase.
- No advanced layout engine based on CSS grid templates.
- No support for arbitrary string width parsing or CSS expression widths in the core API.
- No virtualization work in this refactor.

## 5. Product Principles

- Simplicity over flexibility theater.
- Strong contracts over implicit behavior.
- One source of truth for column structure.
- Safe defaults and predictable fallbacks.
- Internal implementation must match public API guarantees.

## 6. User Stories

### 6.1 Library Consumer

- As a consumer, I can define custom columns with a typed task shape and use them without casts.
- As a consumer, I can insert a custom column before or after a supported anchor and trust it will render there.
- As a consumer, I can provide a custom editor that updates typed task fields safely.
- As a consumer, I can add multiple custom columns without manually compensating for layout issues.

### 6.2 Maintainer

- As a maintainer, I can add a built-in column without duplicating logic in header and row rendering.
- As a maintainer, I can reason about final column order from one resolver function.
- As a maintainer, I can test column ordering, width, and editing behavior independently from the rest of TaskList.

## 7. Requirements

### 7.1 Functional Requirements

1. The system must expose a single `TaskListColumn<TTask>` contract used for both built-in and custom columns.
2. The system must build a final ordered array of columns before rendering.
3. Header and body must render from the same ordered column array.
4. Custom columns must support predictable placement relative to anchors.
5. Missing or invalid anchors must fall back to a documented default anchor.
6. Editing behavior must use the same row-level lifecycle for built-in and custom editable cells.
7. The `updateTask` callback exposed to editors must preserve `TTask` typing.
8. Width calculation must use deterministic numeric values.
9. The public API must not require consumer-side casts for standard usage.

### 7.2 Non-Functional Requirements

1. The refactor must not significantly increase render complexity beyond the existing per-row cost.
2. The design must minimize handwritten special cases.
3. The architecture must support future extension without touching multiple render sites per column.
4. Tests must validate both structural correctness and editing behavior.

## 8. Proposed API

### 8.1 Base Types

```ts
export type BuiltInTaskListColumnId =
  | 'number'
  | 'name'
  | 'startDate'
  | 'endDate'
  | 'duration'
  | 'progress'
  | 'dependencies'
  | 'actions';

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

### 8.2 Key API Decisions

- `width` should be numeric in pixels.
- `renderEditor` replaces `editor` to clarify its purpose.
- `editable` is optional but supported for declarative clarity.
- `before` and `after` may target both built-in and previously inserted custom columns.
- `updateTask` must be typed as `Partial<TTask>`.

## 9. Target Architecture

### 9.1 High-Level Flow

1. `GanttChart<TTask>` receives `tasks` and `additionalColumns`.
2. `TaskList<TTask>` builds built-in column declarations.
3. `TaskList<TTask>` resolves built-in and custom columns into one ordered array.
4. Header renders from `resolvedColumns`.
5. Each row renders from `resolvedColumns`.
6. Editable cells share one row-level `editingColumnId`.

### 9.2 Core Modules

- `columns/types.ts`
  - shared column types
- `columns/createBuiltInColumns.tsx`
  - factory for built-in column declarations
- `columns/resolveTaskListColumns.ts`
  - pure resolver for final column order
- `TaskList.tsx`
  - resolves columns and renders header/body containers
- `TaskListRow.tsx`
  - renders one row by iterating resolved columns
- `TaskListCell.tsx`
  - optional thin wrapper for shared per-cell editor/render behavior
- `cells/*`
  - extracted built-in cell implementations for complex cells

### 9.3 Generic Flow

Generics must be preserved through the full chain:

- `GanttChart<TTask>`
- `TaskList<TTask>`
- `TaskListRow<TTask>`
- `TaskListColumn<TTask>`
- `TaskListColumnContext<TTask>`

The implementation must avoid narrowing back to base `Task` except where absolutely required by legacy internal utilities. If a legacy utility needs base `Task`, that conversion must stay local and must not leak into public column callbacks.

## 10. Column Resolution Rules

### 10.1 Built-In Base Order

The built-in base order remains:

1. `number`
2. `name`
3. `startDate`
4. `endDate`
5. `duration`
6. `progress`
7. `dependencies`
8. `actions`

### 10.2 Custom Column Placement

Resolution rules:

1. Start with the built-in ordered array.
2. Process custom columns in the order provided by the consumer.
3. If `after` matches an existing column id, insert immediately after it.
4. If `before` matches an existing column id, insert immediately before it.
5. If both are omitted, insert after `name`.
6. If the anchor does not exist, insert after `name`.
7. If duplicate column ids are detected, fail predictably in development and document behavior in production.

### 10.3 Intentional Simplicity

This phase does not require a graph-based ordering engine. A single-pass insertion strategy with deterministic fallback is sufficient and preferred.

## 11. Rendering Model

### 11.1 Header

Header rendering must be driven by:

```ts
resolvedColumns.map(column => ...)
```

### 11.2 Body Rows

Each row must render:

```ts
resolvedColumns.map(column => ...)
```

This guarantees that:

- header and body stay structurally aligned
- adding a new anchor or column affects one system instead of multiple JSX branches

### 11.3 Editing Lifecycle

Each row owns:

```ts
const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
```

Rules:

- Only one column editor is open per row at a time.
- `openEditor()` sets the matching column id.
- `closeEditor()` clears it.
- `updateTask()` emits a merged full task patch through `onTasksChange`.
- Both built-in and custom columns use the same mechanism.

## 12. Width Model

### 12.1 Requirement

TaskList width must be derived deterministically from the resolved columns.

### 12.2 Rules

- Use numeric widths only.
- Each column has a concrete width budget.
- Total width is the sum of resolved column widths.
- `effectiveTaskListWidth = max(requestedTaskListWidth, resolvedColumnWidthTotal)`.

### 12.3 Rationale

This avoids:

- parsing CSS strings
- incorrect budget estimates
- drift between layout math and rendered width

## 13. File-Level Refactor Plan

### 13.1 `taskListColumns.ts`

Replace current file with:

- pure type definitions
- anchor types
- exported helper types only

### 13.2 `TaskList.tsx`

Refactor responsibilities to:

- build built-in columns
- resolve final columns
- compute total width from final columns
- render header from resolved columns
- pass resolved columns into rows

Remove:

- hardcoded custom insertion blocks
- separate anchor buckets in JSX

### 13.3 `TaskListRow.tsx`

Refactor responsibilities to:

- own row-level editor state
- build column context once per render
- iterate over resolved columns
- delegate built-in cell complexity into extracted cell components where necessary

Remove:

- duplicated custom column rendering blocks
- custom-only editor path

### 13.4 `GanttChart.tsx`

Refactor responsibilities to:

- preserve `TTask` through TaskList props
- eliminate unsafe casts for columns and callbacks where possible

## 14. Migration Plan

### Phase A: Structural Foundations

1. Introduce new column types.
2. Add resolver function with tests.
3. Create built-in column factory without changing UI behavior yet.

### Phase B: Render Unification

1. Move header rendering to `resolvedColumns`.
2. Move row rendering to `resolvedColumns`.
3. Keep built-in cell UI behavior unchanged.

### Phase C: Editor Unification

1. Introduce single row-level `editingColumnId`.
2. Convert custom columns to the shared editor model.
3. Convert editable built-in columns to the same model where feasible.

### Phase D: Generic Tightening

1. Make `TaskList` and `TaskListRow` generic.
2. Remove internal `as Task` column casts.
3. Update public examples and tests to use typed columns without casts.

### Phase E: Cleanup

1. Remove dead branching code.
2. Remove obsolete width helpers.
3. Document the final API.

## 15. Acceptance Criteria

The refactor is complete when all of the following are true:

1. Header and body both render from the same resolved column array.
2. A custom column can be placed after any built-in anchor and appears correctly.
3. A custom column can be placed before any built-in anchor and appears correctly.
4. Invalid anchors fall back to the documented default position.
5. No standard consumer usage requires `as TaskListColumn<Task>[]`.
6. `updateTask()` in custom editors is typed as `Partial<TTask>`.
7. Width calculations use numeric column widths and match rendered structure.
8. Only one editor is open per row at a time.
9. Existing built-in TaskList behavior remains stable.

## 16. Test Plan

### 16.1 Resolver Tests

- inserts after any built-in anchor
- inserts before any built-in anchor
- preserves input order for multiple columns on same anchor
- falls back correctly on missing anchors
- handles duplicate ids predictably

### 16.2 Rendering Tests

- header and body have matching column order
- built-in columns remain visible with custom columns
- custom columns render in resolved positions
- total width grows correctly from numeric widths

### 16.3 Editing Tests

- custom editor opens and closes correctly
- custom editor updates merged task object
- built-in editor and custom editor obey single-editor-per-row rule
- `updateTask` preserves extended task fields

### 16.4 Type-Level Verification

- example usage with extended task type compiles without casts
- `renderCell`, `renderEditor`, and `updateTask` receive `TTask`-aware types

## 17. Risks and Mitigations

### Risk 1: Refactor touches dense TaskList code

Mitigation:

- extract pure resolver first
- move rendering in small steps
- keep behavior-preserving tests around built-in columns

### Risk 2: Generic tightening exposes hidden typing issues

Mitigation:

- make TaskList and TaskListRow generic before removing legacy casts
- update examples and tests early

### Risk 3: Editor unification could regress built-in editing

Mitigation:

- move one built-in editable column at a time
- keep coverage for name, date, duration, and progress flows

## 18. Out of Scope Follow-Ups

These are deliberately deferred:

- hide/show columns API
- user-driven column ordering
- resizable columns
- persistent column preferences
- virtualization optimization

The new architecture should make these possible later, but they are not part of this PRD.

## 19. Final Recommendation

Proceed with a unified resolved-column architecture rather than patching the current special-case implementation. The simplest durable solution is:

- declarative built-in columns
- declarative custom columns
- one resolver
- one render path
- one editor lifecycle
- numeric width budget
- full generic preservation

This is the smallest refactor that materially improves maintainability, stability, and long-term scalability.

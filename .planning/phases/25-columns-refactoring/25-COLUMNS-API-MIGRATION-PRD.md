# PRD: TaskList Columns API Migration

**Date:** 2026-03-29  
**Status:** Proposed  
**Scope:** `packages/gantt-lib` public TaskList columns API cleanup after Phase 25  
**Related Phase:** 25-columns-refactoring  
**Follow-up Type:** Breaking API cleanup / migration hardening

## 1. Summary

Phase 25 introduced the new unified TaskList column architecture, but the codebase still carries compatibility traces from the old custom-column API. This leaves two ways to define column editors and two mental models in the codebase.

This follow-up migration removes the old API path completely and makes the new column contract the only supported approach.

Target outcome:

- one canonical column type import path
- one canonical editor property: `renderEditor`
- one documented way to place columns: `before` / `after`
- one width model: numeric pixel widths
- no legacy fallback code in runtime
- no legacy examples, docs, or internal usage

This is intentionally a cleanup and standardization phase, not a feature phase.

## 2. Problem Statement

The architecture is already refactored, but the developer experience is still partially ambiguous:

- runtime still supports legacy `editor`
- examples still show legacy API usage
- code readers can see both old and new patterns at once
- maintainers must reason about compatibility paths that are no longer desired
- external adopters cannot clearly tell which API is authoritative

If this state remains, the codebase will drift back into dual-style usage and lose the main DX benefit of the refactor.

## 3. Goals

- Remove legacy column-editor API usage and fallback logic.
- Make the new API the only valid TaskList column API.
- Reduce ambiguity for maintainers and library consumers.
- Keep migration cost low and explicit.
- Produce a clean baseline for future external adoption.

## 4. Non-Goals

- No new column features.
- No built-in column re-architecture beyond API cleanup.
- No temporary deprecation period.
- No runtime compatibility bridge for old editor syntax.
- No plugin system or schema-based columns in this phase.

## 5. Product Principles

- One correct way is better than two partially compatible ways.
- Internal code must model the public API cleanly.
- Breaking changes are acceptable when they eliminate ambiguity.
- Documentation must describe only the current reality.

## 6. User Stories

### 6.1 Maintainer

- As a maintainer, I want to see only one column API in the repo so reviews stay consistent.
- As a maintainer, I want to remove compatibility branches that no longer serve product goals.

### 6.2 External Consumer

- As a consumer, I want one obvious way to define custom TaskList columns.
- As a consumer, I want examples and types to match the real supported API exactly.

## 7. Requirements

### 7.1 Functional Requirements

1. Legacy `editor` support must be removed from runtime column rendering.
2. The only supported custom editor property must be `renderEditor`.
3. Public examples must use only `renderEditor`.
4. Public docs must describe only the new API.
5. The repo must not contain internal feature usage of legacy column editor syntax.
6. Numeric `width` usage must remain the documented and enforced default.
7. Column placement must continue to use `before` / `after`.

### 7.2 DX Requirements

1. A new developer must be able to copy one example and follow the correct API without seeing a second style nearby.
2. The codebase must not require maintainers to remember legacy exceptions when working on TaskList columns.
3. Public migration guidance must be short and explicit.

## 8. Canonical Target API

```ts
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

Supported authoring style:

```ts
const additionalColumns: TaskListColumn<MyTask>[] = [
  {
    id: 'priority',
    header: 'Priority',
    after: 'name',
    width: 120,
    renderCell: ({ task }) => task.priority ?? '-',
    renderEditor: ({ task, updateTask, closeEditor }) => (
      <PriorityEditor
        value={task.priority}
        onChange={(value) => {
          updateTask({ priority: value });
          closeEditor();
        }}
      />
    ),
  },
];
```

## 9. Explicit Breaking Changes

The following old patterns become unsupported:

### 9.1 Legacy editor property

Old:

```ts
{
  id: 'assignee',
  header: 'Assignee',
  renderCell: ...,
  editor: ...
}
```

New:

```ts
{
  id: 'assignee',
  header: 'Assignee',
  renderCell: ...,
  renderEditor: ...
}
```

### 9.2 Legacy import path as primary guidance

If a compatibility re-export remains temporarily, it must not be the documented or example-first path. Canonical docs should point to the new column type location.

### 9.3 Any non-numeric width usage

String width values are not part of the supported API.

## 10. Scope of Migration Work

### 10.1 Runtime Cleanup

- Remove `editor` fallback logic from `TaskListRow.tsx`.
- Ensure custom column editing relies only on `renderEditor`.

### 10.2 Repo-Wide Usage Cleanup

- Replace legacy `editor` usage in website/demo/example code.
- Replace legacy internal examples in tests if present.
- Ensure docs and examples use only the canonical API.

### 10.3 Public Surface Cleanup

- Review whether `taskListColumns.ts` compatibility re-export should remain.
- If retained, it should be treated as a passive bridge, not the canonical API.
- If removed, update public exports and document the breaking import-path change.

### 10.4 Migration Documentation

- Add a short migration note:
  - `editor` -> `renderEditor`
  - use numeric `width`
  - continue using `before` / `after`
  - no runtime backward compatibility

## 11. Recommended Implementation Strategy

### Step 1: Remove ambiguity in runtime

- Delete the fallback:
  - `col.renderEditor ?? (col as any).editor`
- Use only:
  - `col.renderEditor`

### Step 2: Update all first-party usage

- website demos
- README snippets
- tests that intentionally model consumer usage

### Step 3: Decide canonical import path

Option A:
- Keep `taskListColumns.ts` as a thin bridge but stop documenting it.

Option B:
- Remove the bridge and require imports from the new canonical path.

Recommendation:
- Prefer Option B if you want a truly clean break.
- Prefer Option A only if public package ergonomics strongly favor the old path.

### Step 4: Add migration note

- One small MD section is sufficient.
- Avoid a long deprecation narrative since compatibility is intentionally not retained.

## 12. Acceptance Criteria

This migration is complete when all of the following are true:

1. `TaskListRow.tsx` no longer supports `editor`.
2. No repo examples use `editor`.
3. No docs show `editor`.
4. The only documented editor field is `renderEditor`.
5. Column examples use numeric `width`.
6. A maintainer can inspect the repo and find only one supported authoring style.
7. Tests covering custom columns still pass after removing legacy support.

## 13. Test Plan

### 13.1 Structural Checks

- Search repo for `editor:` in TaskList-column authoring contexts.
- Search repo for `?? (col as any).editor` or equivalent fallback logic.

### 13.2 Behavioral Checks

- Existing custom column integration tests still pass.
- Editable custom columns still open and save through `renderEditor`.

### 13.3 Documentation Checks

- README and website examples show only `renderEditor`.
- Migration note is present and accurate.

## 14. Risks and Mitigations

### Risk 1: Silent break for existing external consumers

Mitigation:

- Document the break explicitly.
- Provide a 1-step migration rule: rename `editor` to `renderEditor`.

### Risk 2: Hidden legacy usage remains in examples or tests

Mitigation:

- Run repo-wide search before closing the phase.

### Risk 3: Import-path cleanup becomes larger than intended

Mitigation:

- Decide upfront whether import-path cleanup is in scope for this phase.
- Do not mix runtime cleanup with broad package export redesign unless explicitly approved.

## 15. Open Decision

One explicit decision should be made before execution:

### Should `taskListColumns.ts` remain?

Options:

1. Remove it entirely for a strict API break.
2. Keep it as a re-export bridge but stop documenting it.

Recommendation:

- If the goal is “all new and correct, no ambiguity,” remove it.

## 16. Final Recommendation

Proceed with a hard migration, not a deprecation period.

The value of Phase 25 is reduced if the repo continues to model two APIs at once. The correct cleanup is:

- one editor property
- one documented import path
- one example style
- zero runtime compatibility branches

This is a small but high-leverage follow-up that protects the DX gains of the refactor.

# Phase 23: Additional TaskList Columns - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 23-Additional TaskList Columns
**Areas discussed:** architecture boundary, API shape, typing, edit pipeline, meta semantics, positioning

---

## Architecture Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Built-in domain fields | Library owns business-specific columns like crew, zone, volume | |
| Generic column mechanism | Library owns only table/tasklist mechanism, app owns domain columns | ✓ |

**User's choice:** Generic column mechanism
**Notes:** User explicitly stated that `gantt-lib` must not know product-specific data such as crew, zone, volume, cost, supply, or assignee. The library should render the frame and call external column definitions.

---

## API Shape

| Option | Description | Selected |
|--------|-------------|----------|
| `additionalColumns` now | Keep current built-in columns and add extensibility via a separate prop | ✓ |
| Full `columns` API now | Make both system and custom columns configurable immediately | |

**User's choice:** `additionalColumns` now
**Notes:** Full `columns` was intentionally deferred as a later evolution. Current phase should extend the existing TaskList, not replace its whole column model.

---

## Typing Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Base `Task` only | App manually casts to access domain fields inside renderers | |
| Generic typed task | Column config is generic so renderers/editors receive the extended app task type directly | ✓ |

**User's choice:** Generic typed task
**Notes:** Recommendation accepted after clarifying that this improves DX and avoids repeated manual casts in app code.

---

## Edit Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse `onTasksChange` | Editor emits patch, library merges into task, then uses existing update pipeline | ✓ |
| Separate column callback | Columns save through a new dedicated persistence/update callback | |

**User's choice:** Reuse `onTasksChange`
**Notes:** Recommendation accepted. Goal is to integrate with the existing TaskList/GanttChart update architecture instead of creating a parallel column-specific flow.

---

## Meta Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Declarative only | `meta` describes semantics but library does not act on it yet | ✓ |
| Behavioral now | Library immediately changes scheduling/resource logic based on `meta` flags | |

**User's choice:** Declarative only
**Notes:** User preferred the simpler first step and did not want behavioral coupling to block the generic mechanism.

---

## Positioning

| Option | Description | Selected |
|--------|-------------|----------|
| Append after system columns | Additional columns render after built-in columns only | ✓ |
| Arbitrary placement | Columns can be inserted after any specific base column | |

**User's choice:** Append after system columns
**Notes:** Simpler first iteration. This intentionally narrows the earlier requirement draft that mentioned `after`.

---

## Domain Examples Captured

- Informational columns: volume, zone, cost, assignee
- Editable columns: crew picker, volume input, status selector
- Computed columns: percent by volume, output, variance
- Service/domain columns: fields that may later affect duration, calendar, or resource logic

## Deferred Ideas

- Full unified `columns` API
- Runtime behavior driven by `meta`
- Arbitrary system/custom column reordering
- Separate column persistence pipeline

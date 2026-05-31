# Locations Layer

The Locations Layer extends gantt-lib with a work/location/assignment architecture for managing multiple work templates, location hierarchies, and their assignments to tasks.

This feature is **opt-in** — the visual indicator and the `synced` field are the only gantt-lib surface. The full CRUD, tree generation, and tool API live in the MCP server / runtime-core package.

## Task Interface Extension

A single field `synced` is added to the `Task` interface:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `synced` | `boolean` | `undefined` | When `false`, the task bar renders with a dashed border. `undefined` or `true` renders normally. |

```typescript
interface Task {
  // ... other fields
  synced?: boolean;
}
```

## Visual Indicator — Unsynced Tasks

When `synced === false`, the task bar displays a **dashed red border** with reduced opacity to indicate the task's dates were modified outside the central scheduling engine and need re-sync:

- Dashed 2px outline via `.gantt-tr-unsynced` CSS class
- 0.55 opacity on the bar
- Applied to both regular bars and milestone diamonds
- The class does not affect drag, resize, or dependency behavior

### CSS Customization

```css
/* Override unsynced indicator */
.gantt-tr-unsynced .gantt-tr-task-bar {
  outline: 2px dashed red;
  opacity: 0.55;
}
```

## Architecture Overview

The full system (outside gantt-lib) consists of:

### Work Template
A reusable task definition (name, duration, color, work group). Not a task itself — an template that generates tasks when assigned to a location.

### Location
A node in a location hierarchy (e.g., `Object → Section → Floor`). Each location has a computed materialized path (`object-a/section-1/floor-2`).

### Assignment
A link between a Work Template and a Location, generating a concrete task with computed dates on the Gantt chart. The assignment stores `startDate`, `endDate`, and the `workTemplateId` / `locationId` references.

### View Modes
Synthetic tree views override `parentId` for display without persisting to the task store:
| Mode | Behavior |
|------|----------|
| **master** | Group tasks by Work Template |
| **section** | Group tasks under Location (section level) |
| **floor** | Group tasks under Location (floor level) |

Synthetic parent IDs use reserved prefixes `work:<workId>` and `loc:<locationId>` — never persisted.

## `synced` Lifecycle

```
Work Template assigned      Task created with dates
  ↓                                   ↓
  User moves task in Gantt    User changes duration
  ↓                                   ↓
  synced = false              Task bar shows dashed border
  ↓                                   ↓
  Re-sync via runtime-core    synced = true, dates updated
```

## Related

- [`synced` field on `Task`](./02-task-interface.md)
- [Headless Scheduling Core](./14-headless-scheduling.md) — scheduling engine that powers cascade/re-sync

---

[← Back to API Reference](./INDEX.md)

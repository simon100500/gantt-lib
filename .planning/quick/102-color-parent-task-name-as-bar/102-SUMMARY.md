---
phase: quick-102
plan: "01"
subsystem: TaskRow
tags: [styling, parent-task, color, visual-consistency]
dependency_graph:
  requires: []
  provides: [parent-task-name-color-matching]
  affects: [TaskRow]
tech_stack:
  added: []
  patterns: [inline-style-override]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
decisions:
  - "Use task.color || CSS variable fallback for nameColor, mirroring actual parent bar color logic"
  - "Inline style only applied when nameColor is truthy (parent tasks); undefined for regular tasks avoids any override"
metrics:
  duration: "~2 minutes"
  completed: "2026-03-15"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 102: Color parent task name label to match bar color

**One-liner:** Parent task name labels now render in the same color as their bracket bar via inline style override on `gantt-tr-externalTaskName`.

## What Was Built

The external task name label (the text to the right of the task bar in the gantt row) for parent tasks now matches the parent bar color. Regular task names retain the existing blue CSS class color unchanged.

**Implementation approach:**

A `nameColor` variable is derived immediately after `barColor`:

```ts
const nameColor = isParent
  ? (task.color || 'var(--gantt-parent-bar-color, #333333)')
  : undefined; // regular tasks use CSS class color (#2563eb)
```

The `gantt-tr-externalTaskName` span receives a conditional inline `style` prop:

```tsx
<span
  className="gantt-tr-externalTaskName"
  style={nameColor ? { color: nameColor } : undefined}
>
  {task.name}
</span>
```

- For parent tasks: inline `color` wins over the CSS class `#2563eb`, applying `task.color` if set or falling back to `var(--gantt-parent-bar-color, #333333)` (dark gray matching the bracket bar).
- For regular tasks: `nameColor` is `undefined`, so `style` prop is `undefined` — no override, CSS class color `#2563eb` (blue) applies as before.
- No CSS file changes needed.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Color parent task name to match bar color | ff4e769 | packages/gantt-lib/src/components/TaskRow/TaskRow.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx` — modified with `nameColor` variable and inline style on span
- [x] Commit ff4e769 exists
- [x] Pre-existing TypeScript errors in test files and unrelated components are out of scope; no new errors introduced in TaskRow.tsx

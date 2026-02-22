---
phase: 11-lock-task
plan: 01
title: "Task lock feature — locked?: boolean prop with drag prevention and padlock icon"
one-liner: "Add locked?: boolean prop to Task interface with hook guard, cursor feedback, and visual padlock icon"
subsystem: "task-interaction"
tags: ["feature", "drag-prevention", "visual-feedback"]

dependency_graph:
  requires:
    - "packages/gantt-lib/src/types/index.ts (Task interface)"
    - "packages/gantt-lib/src/hooks/useTaskDrag.ts (drag state management)"
  provides:
    - "locked?: boolean on public Task interface"
    - "locked option on UseTaskDragOptions"
  affects:
    - "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx (icon rendering, prop passing)"
    - "packages/gantt-lib/src/components/TaskRow/TaskRow.css (lock icon styles)"

tech_stack:
  added: []
  patterns:
    - "Early return guard pattern in handleMouseDown for locked tasks"
    - "Cascade filtering with continue statement (not break) for locked successors"
    - "CSS class modifier pattern for locked state (.gantt-tr-locked)"
    - "SVG icon with fill='currentColor' for theme inheritance"

key_files:
  created: []
  modified:
    - "packages/gantt-lib/src/types/index.ts (+4 lines)"
    - "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx (+4 lines)"
    - "packages/gantt-lib/src/hooks/useTaskDrag.ts (+10 lines)"
    - "packages/gantt-lib/src/components/TaskRow/TaskRow.tsx (+15 lines)"
    - "packages/gantt-lib/src/components/TaskRow/TaskRow.css (+15 lines)"

decisions: []

metrics:
  duration: "81s (~1min)"
  completed_date: "2026-02-22"
  tasks_completed: 2
  commits: 2
  files_changed: 5
  lines_added: 48
---

# Phase 11 Plan 01: Task lock feature — locked?: boolean prop with drag prevention and padlock icon Summary

## Overview

Implemented the `locked?: boolean` prop on the Task type model that prevents drag and resize interactions when true, with visual feedback via a padlock icon and `cursor: not-allowed`.

Purpose: Locked tasks represent completed or fixed work that must not be rescheduled. This provides a per-task freeze mechanism independent of `accepted` or `progress`.

## Implementation Summary

### Type Layer (Task 1)

**packages/gantt-lib/src/types/index.ts**
- Added `locked?: boolean` field to the public `Task` interface after `dependencies`
- JSDoc documents: "Optional flag to prevent drag and resize interactions. When true, the task bar cannot be moved or resized. Independent of accepted/progress."

**packages/gantt-lib/src/components/GanttChart/GanttChart.tsx**
- Added `locked?: boolean` to the internal `Task` interface (duplicate for GanttChart imports)
- Same JSDoc comment as public interface

### Hook Layer (Task 1)

**packages/gantt-lib/src/hooks/useTaskDrag.ts**

1. **UseTaskDragOptions interface extension** — Added `locked?: boolean` option

2. **Destructuring** — Added `const locked = options.locked ?? false` in function body

3. **Early return guard** — Added `if (locked) return;` as FIRST line of `handleMouseDown` callback (before `detectEdgeZone`)
   - Prevents any drag state from being set for locked tasks
   - No RAF loop starts, no cursor changes during interaction

4. **Cursor feedback** — Updated `getCursorStyle`:
   ```typescript
   if (locked) return 'not-allowed';
   if (isDragging) return 'grabbing';
   return 'grab';
   ```

5. **Cascade filtering for locked tasks** — In `handleGlobalMouseMove`, inside the `for (const chainTask of activeChain)` loop:
   ```typescript
   if (chainTask.locked) continue; // Phase 11: locked tasks cannot be moved by cascade
   ```
   - Uses `continue` (not `break`) to allow traversal to successors
   - Locked tasks excluded from visual override map but successors still cascade

6. **Cascade completion filtering** — In `handleComplete`'s `chainForCompletion` mapping:
   ```typescript
   ...chainForCompletion
     .filter(chainTask => !chainTask.locked) // Phase 11: skip locked tasks in cascade
     .map(chainTask => { ... })
   ```
   - Prevents locked tasks from being included in `onCascade` result with shifted dates

### Component Layer (Task 2)

**packages/gantt-lib/src/components/TaskRow/TaskRow.tsx**

1. **arePropsEqual update** — Added `prevProps.task.locked === nextProps.task.locked` check
   - Ensures locked state changes trigger re-render

2. **useTaskDrag call** — Added `locked: task.locked` to options object

3. **className modifier** — Updated taskBar className:
   ```tsx
   className={`gantt-tr-taskBar ${isDragging ? 'gantt-tr-dragging' : ''} ${task.locked ? 'gantt-tr-locked' : ''}`}
   ```

4. **Lock icon JSX** — Added SVG as FIRST child of taskBar (before progressBar):
   ```tsx
   {task.locked && (
     <svg className="gantt-tr-lockIcon" viewBox="0 0 24 24" fill="currentColor"
          aria-label="Locked" aria-hidden="false">
       <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
     </svg>
   )}
   ```
   - Material Design padlock path
   - `fill="currentColor"` inherits task bar text color via CSS variable

**packages/gantt-lib/src/components/TaskRow/TaskRow.css**

1. **Lock icon styling** — `.gantt-tr-lockIcon`:
   - 12px width/height
   - margin-right: 4px
   - flex-shrink: 0 (prevents icon compression)
   - opacity: 0.85
   - z-index: 2 (above progress bar, level with duration text)
   - color: `var(--gantt-task-bar-text-color)`

2. **Locked state class** — `.gantt-tr-taskBar.gantt-tr-locked`:
   - cursor: not-allowed
   - Consumer CSS override point (DX-05 pattern)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `locked?: boolean` in types/index.ts | ✅ | Line 84: `locked?: boolean;` |
| `locked?: boolean` in GanttChart.tsx Task | ✅ | Added to internal Task interface |
| `locked` in UseTaskDragOptions | ✅ | Added after `onCascade` field |
| `handleMouseDown` early return | ✅ | Line 822: `if (locked) return;` |
| `getCursorStyle` returns 'not-allowed' | ✅ | Line 905: `if (locked) return 'not-allowed';` |
| Cascade loop skips locked tasks | ✅ | Line 394: `if (chainTask.locked) continue;` |
| chainForCompletion.filter(t => !t.locked) | ✅ | Line 755: `.filter(chainTask => !chainTask.locked)` |
| arePropsEqual checks task.locked | ✅ | Line 80: locked check added |
| useTaskDrag receives locked | ✅ | Line 156: `locked: task.locked` |
| Lock SVG renders conditionally | ✅ | Lines 205-212: padlock icon |
| gantt-tr-locked className | ✅ | Line 194: className includes locked modifier |
| gantt-tr-lockIcon CSS rule | ✅ | Lines 199-212: icon styles |
| TypeScript build passes | ✅ | Build completed with zero errors |

## Commits

| Commit | Hash | Description |
|--------|------|-------------|
| Task 1 | `1a9208b` | feat(11-01): add locked field to Task interfaces and hook guard |
| Task 2 | `dc99712` | feat(11-01): add lock icon rendering and arePropsEqual update to TaskRow |

## Self-Check: PASSED

- All modified files exist
- All commits exist in git log
- TypeScript build passes with zero errors
- All plan success criteria met

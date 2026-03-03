---
phase: quick-44
plan: 44
subsystem: dependency-lines
tags: [dependency, chip-selection, svg, highlighting, state-lift]
dependency_graph:
  requires: [quick-43]
  provides: [dep-chip-arrow-highlight]
  affects: [DependencyLines, GanttChart, TaskList]
tech_stack:
  added: []
  patterns: [state-lift, callback-prop, css-class-toggle, svg-marker]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx
    - packages/gantt-lib/src/components/DependencyLines/DependencyLines.css
decisions:
  - "selectedChip state lifted to GanttChart so DependencyLines (sibling of TaskList) can receive it"
  - "isSelected computed inline in render using id === predecessorId-successorId-linkType pattern"
  - "arrowhead-selected marker duplicates arrowhead-cycle color (#ef4444) with a distinct id for clarity"
metrics:
  duration: "4 min"
  completed: "2026-03-03T12:10:04Z"
  tasks_completed: 1
  files_modified: 4
---

# Phase quick-44 Plan 44: Selected Dep Chip Highlights Its Arrow Summary

Selected dep chip now highlights its corresponding SVG arrow red (#ef4444, stroke-width 2) by lifting selectedChip state from TaskList to GanttChart and threading it down to DependencyLines as selectedDep.

## What Was Built

Clicking a dependency chip in the TaskList's "Связи" column now turns the matching SVG dependency arrow in the Gantt grid red. The arrowhead also turns red via a new `arrowhead-selected` SVG marker. The lag label (if present) also renders red for the selected dependency. Deselecting the chip (click again or press Escape) restores the arrow to its default gray color.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Wire selectedChip from TaskList up to GanttChart and down to DependencyLines | 5b42896 | TaskList.tsx, GanttChart.tsx, DependencyLines.tsx, DependencyLines.css |

## Implementation Details

### State Lift Pattern

`selectedChip` previously lived entirely inside `TaskList.tsx`. Since `DependencyLines` is a sibling (both rendered inside `GanttChart`), the state was lifted to `GanttChart`:

1. **TaskList.tsx** — new optional prop `onSelectedChipChange` called on every `setSelectedChip` (chip select, Escape, outside-click)
2. **GanttChart.tsx** — new `useState<{...} | null>(null)` for `selectedChip`, passed as `onSelectedChipChange={setSelectedChip}` to TaskList and `selectedDep={selectedChip}` to DependencyLines
3. **DependencyLines.tsx** — new optional prop `selectedDep`, `arrowhead-selected` marker, `isSelected` computed per line using `id === predecessorId-successorId-linkType`
4. **DependencyLines.css** — new `.gantt-dependency-selected` class with `stroke: #ef4444; stroke-width: 2`

### Visual Hierarchy (no cycle conflict)

`isSelected` takes priority over `hasCycle` for class and marker selection, so a selected-but-cyclic arrow renders as selected (red, bold) while selected state is active.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `packages/gantt-lib/src/components/TaskList/TaskList.tsx` — modified
- [x] `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` — modified
- [x] `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx` — modified
- [x] `packages/gantt-lib/src/components/DependencyLines/DependencyLines.css` — modified
- [x] Build passed: ESM + CJS + DTS all succeeded with 0 TypeScript errors
- [x] Commit 5b42896 exists

## Self-Check: PASSED

---
status: investigating
trigger: "При перемещении (drag & drop) задачи между двумя свёрнутыми родителями задача попадает в первого родителя, а должна размещаться просто между ними без изменения иерархии."
created: 2026-03-15T00:00:00Z
updated: 2026-03-15T00:00:00Z
---

## Current Focus

hypothesis: When a parent is collapsed, its collapsed-area visual region captures drop events that should fall "between" nodes at the same hierarchy level. The drop target detection likely treats the zone below a collapsed parent as "inside" it.
test: Reading drag/drop logic in useTaskDrag.ts and taskListReorder.ts to find how parentId is determined on drop
expecting: Find a code path where a collapsed parent's end-boundary is not correctly accounted for, causing the drop to be attributed to that parent instead of between nodes
next_action: Read useTaskDrag.ts, taskListReorder.ts, TaskListRow.tsx fully

## Symptoms

expected: Task dragged between parent1 and parent2 stays at the same hierarchy level (not nested under either parent)
actual: Task ends up inside parent1 (becomes its child)
errors: No explicit errors
reproduction: 1. Create two parents with children, 2. Collapse both parents, 3. Drag a task into the gap between two collapsed parents
started: Unknown

## Eliminated

(none yet)

## Evidence

(none yet)

## Resolution

root_cause:
fix:
verification:
files_changed: []

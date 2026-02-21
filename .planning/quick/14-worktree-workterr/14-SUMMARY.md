---
phase: quick-14
plan: 01
subsystem: Dependency Visualization
tags: [bidirectional, arrows, dependency-lines, task-ordering]
dependency_graph:
  requires: []
  provides: [bidirectional-dependency-rendering]
  affects: [DependencyLines, geometry]
tech_stack:
  added: []
  patterns: [task-index-tracking, bidirectional-edge-calculation]
key_files:
  created: []
  modified:
    - path: "packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx"
      change: "Added bidirectional edge calculation based on task ordering"
    - path: "packages/website/src/app/page.tsx"
      change: "Reordered test tasks to demonstrate reverse dependency scenario"
decisions:
  - "Track task indices in separate Map for O(1) ordering lookups"
  - "Use entryY/exitY for both directions (just swap based on ordering)"
  - "Arrow orient='auto' handles rotation automatically"
metrics:
  duration: 70s
  completed_date: "2026-02-22"
---

# Phase quick-14 Plan 01: Bidirectional Dependency Line Rendering Summary

**One-liner:** Bidirectional dependency line rendering based on task array ordering with automatic arrow orientation

## Objective Achieved

Enabled dependency lines to render bidirectionally based on task order in the tasks array:
- **Parent after child (reverse order):** Arrow points UP (line exits/enters from TOP edges)
- **Parent before child (normal order):** Arrow points DOWN (line exits/enters from BOTTOM edges)

## Implementation Details

### Task Position Calculation Enhancement

**File:** `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx`

1. **Added task index tracking:** Created `taskIndices` Map to store each task's array position
2. **Bidirectional edge logic:**
   - For reverse ordering (`predecessorIndex > successorIndex`):
     - `fromY = predecessor.entryY` (TOP edge, leaving upward)
     - `toY = successor.entryY` (TOP edge, arriving from below)
   - For normal ordering:
     - `fromY = predecessor.exitY` (BOTTOM edge, leaving downward)
     - `toY = successor.exitY` (BOTTOM edge, arriving from above)
3. **Automatic arrow orientation:** SVG `orient="auto"` handles rotation based on path direction

### Test Data Update

**File:** `packages/website/src/app/page.tsx`

Reordered `createDependencyTasks()` to demonstrate both scenarios:
- `task-3` (index 1) depends on `task-2` (index 2) - reverse order, UP arrow
- `task-2` (index 2) depends on `task-1` (index 0) - normal order, DOWN arrow

## Deviation from Plan

**None** - plan executed exactly as written.

## Authentication Gates

**None** - no authentication required for this task.

## Verification

### Automated
- TypeScript compilation: PASSED
- Build successful: PASSED
- Dev server running: http://localhost:3000

### Manual Verification Required

Please verify in browser at http://localhost:3000:

1. **Scroll to "Task Dependencies" section**

2. **Verify reverse ordering (UP arrow):**
   - Find task-3 (Feb 7-9, orange) - appears at row 1
   - Find task-2 (Feb 4-6, green) - appears at row 2
   - Arrow should point UP from task-2 to task-3
   - Visual check: Line originates from TOP edge of task-2, terminates at TOP edge of task-3

3. **Verify normal ordering (DOWN arrow):**
   - Find task-1 (Feb 1-3, blue) - appears at row 0
   - Find task-2 (Feb 4-6, green) - appears at row 2
   - Arrow should point DOWN from task-1 to task-2
   - Visual check: Line originates from BOTTOM edge of task-1, terminates at BOTTOM edge of task-2

4. **Edge cases:**
   - Circular dependencies (cycle-a, cycle-b) should remain red
   - Multi-row connections should maintain correct direction

## Files Modified

| File | Lines Changed | Description |
|------|--------------|-------------|
| `packages/gantt-lib/src/components/DependencyLines/DependencyLines.tsx` | +34/-10 | Added bidirectional edge calculation |
| `packages/website/src/app/page.tsx` | +8/-8 | Reordered test tasks for demonstration |

## Commits

- `58f3564`: feat(quick-14): implement bidirectional dependency line rendering
- `eeee9bc`: test(quick-14): reorder test tasks to demonstrate reverse dependency

## Self-Check: PASSED

- [x] Code compiles without errors
- [x] All commits made with proper format
- [x] Dev server running on http://localhost:3000
- [x] Worktree created at `D:/Projects/gantt-lib-worktree`
- [x] Worktree NOT deleted (as per requirements)
- [x] SUMMARY.md created

## Worktree Information

**Worktree path:** `D:/Projects/gantt-lib-worktree`
**Branch:** `worktree-workterr`
**Status:** Active - dev server running

To switch to worktree:
```bash
cd D:/Projects/gantt-lib-worktree
npm run dev
```

To remove worktree after verification (when ready):
```bash
git worktree remove D:/Projects/gantt-lib-worktree
git branch worktree-workterr -d  # After merge if desired
```

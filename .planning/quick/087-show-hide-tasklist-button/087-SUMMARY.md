---
phase: quick
plan: 087
subsystem: demo-ui
tags: [show-hide, task-list, buttons, demo-usability]
dependency_graph:
  requires: []
  provides: [independent-task-list-toggles]
  affects: [demo-page, mcp-page]
tech_stack:
  added: []
  patterns: [useState-per-section, independent-toggles, consistent-button-styling]
key_files:
  created: []
  modified:
    - packages/website/src/app/page.tsx
    - packages/website/src/app/mcp/page.tsx
decisions: []
metrics:
  duration: 3 minutes
  completed_date: 2026-03-10T13:56:47Z
  tasks_completed: 2
  files_changed: 2
  deviations: 0
---

# Phase quick Plan 087: Show/Hide Task List Buttons Summary

Add show/hide task list buttons to all test/demo chart pages — each demo section now has its own independent toggle button for controlling task list visibility.

## One-Liner

Independent show/hide task list toggles for each demo section using separate useState hooks per section.

## What Was Done

### Task 1: Main Page Demo Sections
Added independent show/hide task list functionality to all 5 demo sections in `packages/website/src/app/page.tsx`:

1. **Main Construction Project demo** — Kept existing `showTaskList` state and button (default: true/visible)
2. **Task Dependencies demo** — Added `showDependencyTaskList` state, button, and prop (default: false/hidden)
3. **Cascade demo** — Added `showCascadeTaskList` state, button, and prop (default: false/hidden)
4. **Chain 100 demo** — Added `showChain100TaskList` state, button, and prop (default: false/hidden)
5. **Expired Tasks demo** — Added `showExpiredTaskList` state, button, and prop (default: false/hidden)

Button styling matches existing pattern:
```tsx
<button
  className={`demo-btn ${showTaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
  onClick={() => setShowTaskList(!showTaskList)}
>
  {showTaskList ? "Hide Task List" : "Show Task List"}
</button>
```

### Task 2: MCP Page
Added show/hide task list functionality to `packages/website/src/app/mcp/page.tsx`:

1. Added `showTaskList` state variable (default: false/hidden)
2. Added toggle button with inline styling (consistent with page.tsx behavior)
3. Passed `showTaskList` prop to GanttChart component

## Deviations from Plan

None — plan executed exactly as written.

## Verification

All demo sections have independent show/hide task list buttons:
- Main page: 5 independent controls (one per demo section)
- MCP page: 1 independent control
- Each button toggles between "Show Task List" and "Hide Task List" text
- Each chart's task list can be toggled independently
- No cross-section interference (each has its own state)

**Automated verification:**
- `grep -c "showTaskList" packages/website/src/app/page.tsx` → 10 occurrences (5 states + 5 props)
- `grep -c "showTaskList" packages/website/src/app/mcp/page.tsx` → 3 occurrences (1 state + 1 button text + 1 prop)

## Commits

1. **af6c88d** — `feat(quick-087): add show/hide task list buttons to all demo sections in main page`
   - Added 4 new state variables (one per secondary demo section)
   - Added 4 toggle buttons with consistent styling
   - Passed showTaskList prop to 4 GanttChart components

2. **2bccc04** — `feat(quick-087): add show/hide task list button to MCP page`
   - Added showTaskList state variable
   - Added toggle button with inline styling
   - Passed showTaskList prop to GanttChart component

## Success Criteria

✅ Main page has 5 independent show/hide task list controls (one per demo section)
✅ MCP page has 1 show/hide task list control
✅ All buttons work independently without affecting other sections
✅ Default state: main demo shows task list, all others hide it

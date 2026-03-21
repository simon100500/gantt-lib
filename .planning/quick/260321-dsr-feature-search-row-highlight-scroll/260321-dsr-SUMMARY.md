---
phase: quick-feature-search-row-highlight-scroll
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskList/TaskList.tsx
  - packages/gantt-lib/src/components/TaskList/TaskList.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "Пользователь может ввести текст поиска в TaskList"
    - "При вводе подсвечиваются совпадающие задачи"
    - "При нажатии Enter происходит прокрутка к первому совпадению"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.tsx"
      provides: "Search input state and filter logic"
      exports: ["searchQuery", "searchFilteredTasks"]
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Highlight style for matched tasks"
  key_links:
    - from: "TaskList.tsx search input"
      to: "visibleTasks filter"
      via: "task.name.includes(searchQuery)"
      pattern: "task.name.toLowerCase().includes"
    - from: "Search input Enter key"
      to: "onScrollToTask callback"
      via: "first matched task ID"
      pattern: "onScrollToTask.*firstMatch"
---
subsystem: task-list-search
tags: [feature, search, tasklist, ux]
dependency_graph:
  requires:
    - TaskList component
    - onScrollToTask callback
  provides:
    - Task search functionality
    - Real-time filtering
  affects:
    - TaskList rendering
    - Task filtering UX
tech_stack:
  added: []
  patterns:
    - useState for search query
    - useMemo for filtered tasks
    - Case-insensitive search
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskList.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions: []
metrics:
  duration: "5 minutes"
  completed_date: "2026-03-21"
---

# Phase quick-feature-search-row-highlight-scroll Plan 01: Search in TaskList Summary

**One-liner:** Search input in TaskList header with real-time filtering by task name and Enter-to-scroll functionality.

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Details

### Task 1: Add Search Input to TaskList

**Changes made:**
1. Added `searchQuery` state to TaskList component
2. Created `searchFilteredTasks` memoized value that filters `visibleTasks` by name (case-insensitive)
3. Added `handleSearchKeyDown` callback to handle Enter key and scroll to first matched task
4. Replaced `visibleTasks` with `searchFilteredTasks` in rendering logic
5. Updated drag-drop handlers to use `searchFilteredTasks`
6. Added search input to TaskList header
7. Added CSS styles for search input

**Key implementation decisions:**
- Search filters `visibleTasks` (already filtered by collapsed state) rather than all tasks
- Search is case-insensitive for better UX
- Empty search query shows all visible tasks (no filter applied)
- Enter key scrolls to first matched task using existing `onScrollToTask` callback
- Drag-drop operations work correctly with filtered view

## Verification

- [x] Field appears in TaskList header
- [x] Typing text filters tasks in real-time
- [x] Enter scrolls to first matched task
- [x] Clearing search returns full task list
- [x] Build passes without errors

## Known Stubs

None - all functionality is implemented.

## Self-Check: PASSED

All created files exist and all commits are present.

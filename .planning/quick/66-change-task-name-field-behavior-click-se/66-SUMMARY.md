---
phase: quick-66
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: []
user_setup: []
must_haves:
  truths:
    - "Single click on task name selects the row (like № cell)"
    - "Double click on task name enters edit mode"
    - "Typing while name is selected enters edit mode"
    - "No navigate button exists (redundant with new click-to-select behavior)"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskList/TaskListRow.tsx"
      provides: "Task name click/double-click handlers, keyboard edit trigger"
      contains: "handleNameClick, handleNameDoubleClick, handleRowKeyDown"
    - path: "packages/gantt-lib/src/components/TaskList/TaskList.css"
      provides: "Visual styling for selectable task name"
      contains: ".gantt-tl-name-trigger cursor style"
  key_links:
    - from: "handleNameClick"
      to: "onRowClick"
      via: "direct callback invocation"
      pattern: "onRowClick\\(task\\.id\\)"
    - from: "handleNameDoubleClick"
      to: "setEditingName(true)"
      via: "state update"
      pattern: "setEditingName\\(true\\)"
    - from: "handleRowKeyDown"
      to: "setEditingName(true)"
      via: "keyboard event detection"
      pattern: "!editingName && .*key.*length===1 && setEditingName\\(true\\)"
subsystem: task-list
tags: [ux, click-behavior, double-click, keyboard-shortcut]
dependency_graph:
  requires: []
  provides: [task-name-click-select]
  affects: [task-list-row]
tech_stack:
  added: []
  patterns: [click-to-select, double-click-to-edit, keyboard-edit-trigger]
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx
    - packages/gantt-lib/src/components/TaskList/TaskList.css
decisions: []
metrics:
  duration: 54s
  completed_date: "2026-03-08"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-66 Plan 01: Change Task Name Field Behavior Summary

**One-liner:** Task name field now uses standard UI conventions - single click selects row, double-click or typing enters edit mode, navigate button removed as redundant

## What Was Built

Updated task name field interaction model in TaskListRow component to follow standard UI/UX conventions:

### Interaction Changes
- **Single click** on task name now selects the row (same behavior as № cell)
- **Double click** on task name enters edit mode (shows input field with current name)
- **Typing** while row is selected enters edit mode (clears field, accepts typing)
- **Navigate button** removed from № cell (redundant with new click-to-select behavior)

### Implementation Details

**TaskListRow.tsx changes:**
1. Modified `handleNameClick` to call `onRowClick(task.id)` instead of entering edit mode
2. Added `handleNameDoubleClick` callback to enter edit mode on double-click
3. Added `handleRowKeyDown` callback to detect printable keys and enter edit mode
4. Updated row div with `onKeyDown={handleRowKeyDown}` and `tabIndex={isSelected ? 0 : -1}`
5. Updated name trigger button with `onDoubleClick={handleNameDoubleClick}`
6. Removed navigate icon SVG and title attribute from № cell

**TaskList.css changes:**
1. Changed `.gantt-tl-name-trigger` cursor from `text` to `pointer`
2. Removed navigate icon styles (`.gantt-tl-num-icon` display rules)
3. Removed hover-to-reveal icon behavior on `.gantt-tl-cell-number:hover`
4. Added `.gantt-tl-name-trigger:active` state for tactile double-click feedback

## Deviations from Plan

None - plan executed exactly as written.

## Verification Status

**Automated verification:**
- Build successful: CJS (71ms), ESM (71ms), DTS (1302ms)
- Pre-existing test failures in dateUtils.test.ts are unrelated to these changes

**Human verification pending:** Server running at http://localhost:3000

## Usage

The new interaction model is now live:
- Click any task name to select the row (highlights row, centers task bar)
- Double-click any task name to edit (shows input field)
- Select a row, then type any letter to edit (clears field, ready for typing)
- № cell shows only row number (no hover-to-reveal icon)
- Existing Enter/Escape keyboard shortcuts still work in edit mode

## Technical Notes

- Keyboard edit trigger uses `e.key.length === 1` to detect printable characters
- Modifiers (Ctrl/Meta/Alt) are excluded to avoid conflicts with browser shortcuts
- Selected rows receive `tabIndex={0}` for keyboard accessibility
- Input focus is handled by existing `useEffect` (line 262)
- Navigate button removal simplifies UI without losing functionality

---
phase: quick
plan: 086
subsystem: task-list-styling
tags: [css, theming, ui-polish]
dependency_graph:
  requires: []
  provides: [css-variable-vertical-separators]
  affects: [task-list-visuals]
tech-stack:
  added: []
  patterns: [css-variable-configuration, optional-ui-elements]
key-files:
  created: []
  modified:
    - path: packages/gantt-lib/src/styles.css
      changes: Added --gantt-tl-vertical-separators CSS variable (default: none)
    - path: packages/gantt-lib/src/components/TaskList/TaskList.css
      changes: Replaced hardcoded border-right with CSS variable
decisions: []
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-10T13:48:00Z"
---

# Phase Quick Plan 086: Remove Vertical Separators Summary

**One-liner:** Optional vertical separators between task list columns via CSS variable (default: hidden)

## Objective Achieved

Removed vertical separator lines between task list columns by default, with optional CSS variable to enable them. This provides a cleaner UI appearance with less visual clutter while maintaining customizability for users who prefer separators.

## Implementation Details

### Task 1: Add CSS Variable for Optional Vertical Separators

**File Modified:** `packages/gantt-lib/src/styles.css`

Added two new CSS variables to the CSS Variables section:
- `--gantt-tl-vertical-separators: none;` - Controls whether vertical separators are shown (default: none)
- `--gantt-tl-vertical-separators-width: 1px solid var(--gantt-grid-line-color, #e0e0e0);` - The border style when enabled

Included comment explaining that users can set `--gantt-tl-vertical-separators: var(--gantt-tl-vertical-separators-width);` to enable separators.

**Commit:** `8ec3d0f`

### Task 2: Update TaskList.css to Use CSS Variable

**File Modified:** `packages/gantt-lib/src/components/TaskList/TaskList.css`

Replaced hardcoded `border-right: 1px solid var(--gantt-grid-line-color, #e0e0e0);` with the CSS variable in two locations:
1. Line 50 in `.gantt-tl-headerCell`: Changed to `border-right: var(--gantt-tl-vertical-separators);`
2. Line 86 in `.gantt-tl-cell`: Changed to `border-right: var(--gantt-tl-vertical-separators);`

**Preserved (NOT modified):**
- Line 13 (`.gantt-tl-overlay` border-right) - Main separator between task list and gantt grid
- Line 54 (`.gantt-tl-headerCell:last-child` border-right: none) - Last-child rule
- Line 92 (`.gantt-tl-cell:last-child` border-right: none) - Last-child rule

**Commit:** `acf04b1`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Status

1. **Build:** CSS files successfully compiled (25.68 KB each in dist/)
   - Note: TypeScript build failed due to pre-existing missing @radix-ui/react-popover dependency (not caused by this change)

2. **CSS Variables Added:** Confirmed via grep
   ```
   39:  --gantt-tl-vertical-separators: none;
   40:  --gantt-tl-vertical-separators-width: 1px solid var(--gantt-grid-line-color, #e0e0e0);
   ```

3. **TaskList.css Updated:** Confirmed via grep
   - Line 50: `border-right: var(--gantt-tl-vertical-separators);`
   - Line 86: `border-right: var(--gantt-tl-vertical-separators);`

4. **Main Border Preserved:** Line 13 still has `border-right: 1px solid var(--gantt-grid-line-color, #e0e0e0);`

5. **Last-child Rules Preserved:** Lines 54 and 92 still have `border-right: none;`

## Success Criteria Met

- [x] Vertical separator lines between task list columns are hidden by default
- [x] Task list right border (separator from gantt grid) remains visible
- [x] Users can enable separators by setting CSS variable
- [x] No hardcoded border-right values on column cells (replaced with CSS variable)
- [x] Last-child rules still prevent border on final column

## Usage Example

To enable vertical separators, users can add custom CSS:

```css
:root {
  --gantt-tl-vertical-separators: var(--gantt-tl-vertical-separators-width);
}
```

## Files Changed

1. `packages/gantt-lib/src/styles.css` - Added CSS variables (5 lines)
2. `packages/gantt-lib/src/components/TaskList/TaskList.css` - Updated border-right declarations (2 lines)

## Self-Check: PASSED

**Commits verified:**
- [x] 8ec3d0f: feat(quick-086): add CSS variables for optional vertical separators
- [x] acf04b1: feat(quick-086): update TaskList.css to use CSS variable for column separators

**Files verified:**
- [x] packages/gantt-lib/src/styles.css - Contains CSS variables
- [x] packages/gantt-lib/src/components/TaskList/TaskList.css - Uses CSS variables

**Summary file created:**
- [x] .planning/quick/086-remove-vertical-separators/086-SUMMARY.md

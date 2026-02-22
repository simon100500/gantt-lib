---
phase: quick-020-progress-percent
plan: 01
subsystem: TaskRow component
tags:
  - progress-display
  - space-detection
  - ui-enhancement
dependency_graph:
  requires:
    - TaskRow component
    - progress-bar rendering
  provides:
    - progress percentage display with intelligent positioning
  affects:
    - task bar visual layout
    - external label positioning
tech_stack:
  added: []
  patterns:
    - space-based text positioning (estimated width calculation)
    - dual-mode rendering (inside/outside task bar)
key_files:
  created: []
  modified:
    - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
    - packages/gantt-lib/src/components/TaskRow/TaskRow.css
decisions:
  - key: "Estimated text width calculation"
    rationale: "Used fixed estimates (62px for 1-9 days, 76px for 10+ days) instead of canvas measurement for performance"
    alternatives: ["Canvas text measurement", "DOM element measurement"]
  - key: "Progress text format"
    rationale: "Simple percentage ('Y%') for external display, duration + percentage ('X д Y%') for internal display"
metrics:
  duration: "2 minutes"
  completed_date: "2026-02-22"
---

# Quick Task 020: Progress Percentage Display Summary

**One-liner:** Intelligent progress percentage display with space-aware positioning (inside bar for wide tasks, outside before task name for narrow tasks)

## Overview

Added progress percentage display to task bars with automatic positioning based on available space. The implementation provides clear visual feedback for task completion status while maintaining readability across varying task bar widths.

## Implementation Details

### Task 1: Progress Percentage Display Logic

**File:** `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx`

Added logic to determine whether progress percentage should display inside or outside the task bar:

1. **Space detection:** Calculate if progress text fits inside the bar by comparing display width against estimated text width
2. **Inside display:** Show progress percentage after duration text (format: "X д Y%")
3. **Outside display:** Show progress percentage before task name (format: "Y% Task Name")
4. **Zero progress handling:** No percentage displays when task.progress = 0 or undefined

Key code additions:
```tsx
// Estimate: duration text (~"15 д" = ~30px) + progress text (~"100%" = ~30px) + padding (~16px)
const estimatedTextWidth = durationDays >= 10 ? 76 : 62;
const showProgressInside = progressWidth > 0 && displayWidth > estimatedTextWidth;

// Inside task bar (after duration)
{progressWidth > 0 && showProgressInside && (
  <span className="gantt-tr-progressText">
    {progressWidth}%
  </span>
)}

// Outside task bar (before task name)
{progressWidth > 0 && !showProgressInside && (
  <span className="gantt-tr-externalProgress">
    {progressWidth}%
  </span>
)}
```

### Task 2: Progress Text Styling

**File:** `packages/gantt-lib/src/components/TaskRow/TaskRow.css`

Added CSS styles for progress text elements:

1. **`.gantt-tr-progressText` (inside bar):**
   - Color: `var(--gantt-task-bar-text-color)` for consistency
   - Font: 0.875rem, weight 500
   - Position: relative with z-index: 2 (above progress bar overlay)
   - Spacing: 4px margin-left

2. **`.gantt-tr-externalProgress` (outside bar):**
   - Color: #666666 (matches date labels)
   - Font: 0.85rem, weight 500
   - Spacing: 4px margin-right (space before task name)
   - Order: Progress span → Task name span

## Deviations from Plan

None - plan executed exactly as written. The checkpoint was approved by the user.

## Commits

| Hash | Message | Files |
|------|---------|-------|
| 1372fe9 | feat(quick-020): add progress percentage display logic with space detection | TaskRow.tsx |
| 5296367 | feat(quick-020): style progress text elements | TaskRow.css |

## Verification

User verified the implementation via checkpoint:
- Wide task bars (10+ days) display progress inside as "X д Y%"
- Narrow task bars (1-2 days) display progress outside before task name as "Y% Task Name"
- Tasks with 0% or no progress show no percentage
- Progress position updates dynamically when dragging/resizing tasks

## Success Criteria Met

- Progress percentage visible for all tasks with progress > 0
- Intelligent positioning based on available space (estimated text width calculation)
- Consistent styling with existing UI elements
- No regressions to existing duration or task name display

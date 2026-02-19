---
phase: 04-npm-packaging
plan: 04
subsystem: packaging
tags: [npm, library-source, css-modules-to-plain-css, git-mv]

# Dependency graph
requires:
  - phase: 04-02
    provides: Library package manifest with exports field and tsup config
  - phase: 04-03
    provides: Website package with Modal component moved out
provides:
  - Complete library source code in packages/gantt-lib/src/
  - Plain CSS (no CSS Modules) with prefixed class names
  - Library entry point (index.ts) with 'use client' and CSS import
  - CSS aggregator (styles.css) for tsup emission
affects: [04-05-build-verify]

# Tech tracking
tech-stack:
  added: []
  patterns: [git-mv-history-preservation, css-class-prefixing, css-aggregator-pattern]

key-files:
  created:
    - packages/gantt-lib/src/index.ts
    - packages/gantt-lib/src/styles.css
    - packages/gantt-lib/src/components/index.ts
  modified:
    - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
    - packages/gantt-lib/src/components/GanttChart/GanttChart.css
    - packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
    - packages/gantt-lib/src/components/TaskRow/TaskRow.css
    - packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx
    - packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.css
    - packages/gantt-lib/src/components/GridBackground/GridBackground.tsx
    - packages/gantt-lib/src/components/GridBackground/GridBackground.css
    - packages/gantt-lib/src/components/TodayIndicator/TodayIndicator.tsx
    - packages/gantt-lib/src/components/TodayIndicator/TodayIndicator.css
    - packages/gantt-lib/src/components/DragGuideLines/DragGuideLines.tsx
    - packages/gantt-lib/src/components/DragGuideLines/DragGuideLines.css

key-decisions:
  - "Use git mv to preserve file history during migration"
  - "Rename .module.css to .css (drop CSS Modules)"
  - "Prefix all CSS class names to avoid collisions (gantt-*, gantt-tr-*, gantt-tsh-*, gantt-gb-*, gantt-ti-*, gantt-dgl-*)"
  - "CSS aggregator pattern: @import all component CSS into styles.css"
  - "Library index.ts imports styles.css to trigger tsup CSS emission"
  - "Modal component excluded from library (website-only)"

patterns-established:
  - "Pattern 1: git mv for file history preservation"
  - "Pattern 2: CSS class name prefixing per component for global CSS safety"
  - "Pattern 3: CSS aggregator with @import for bundler emission"
  - "Pattern 4: 'use client' directive at top of library entry point"

requirements-completed: [DX-01, DX-02, DX-03, DX-04]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 04 Plan 04: Library Source Migration Summary

**Migrated all library source files to packages/gantt-lib/src/ using git mv, converted CSS Modules to plain CSS with prefixed class names, and created library entry point with CSS aggregator for tsup bundling**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T21:38:25Z
- **Completed:** 2026-02-19T21:41:12Z
- **Tasks:** 2
- **Files moved/modified:** 26 files moved + 15 files modified

## Accomplishments

- Moved all library source files from src/ to packages/gantt-lib/src/ using git mv (26 files)
- Renamed all .module.css files to .css (dropped CSS Modules)
- Updated all component files to use plain CSS imports instead of CSS Modules
- Prefixed all CSS class names to avoid collisions:
  - gantt-* for GanttChart (container, scrollContainer, stickyHeader, taskArea)
  - gantt-tr-* for TaskRow (row, taskBar, dragging, resizeHandle, etc.)
  - gantt-tsh-* for TimeScaleHeader (header, monthRow, dayRow, dayCell, etc.)
  - gantt-gb-* for GridBackground (gridBackground, weekendBlock, gridLine, etc.)
  - gantt-ti-* for TodayIndicator (indicator)
  - gantt-dgl-* for DragGuideLines (guideLine)
- Created packages/gantt-lib/src/styles.css aggregator with @import directives
- Created packages/gantt-lib/src/index.ts with 'use client' directive, CSS import, and all public API exports
- Updated packages/gantt-lib/src/components/index.ts without Modal export
- Modal component excluded from library (website-only, already moved to packages/website in 04-03)
- Git history preserved via git mv for all moved files

## Task Commits

Each task was committed atomically:

1. **Task 1: git mv source files to packages/gantt-lib/src/** - `16f79b1` (feat)
2. **Task 2: Update CSS imports and create library entry point** - `8aa5934` (feat)

**Fix commits:** None

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

### Created:
- `packages/gantt-lib/src/index.ts` - Library entry point with 'use client', CSS import, and exports (NEW)
- `packages/gantt-lib/src/styles.css` - CSS aggregator with @import directives (NEW)
- `packages/gantt-lib/src/components/index.ts` - Component barrel exports (NEW)

### Moved via git mv:
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` (from src/components/GanttChart/)
- `packages/gantt-lib/src/components/GanttChart/index.tsx`
- `packages/gantt-lib/src/components/GanttChart/GanttChart.css` (renamed from GanttChart.module.css)
- `packages/gantt-lib/src/components/TaskRow/TaskRow.tsx`
- `packages/gantt-lib/src/components/TaskRow/index.tsx`
- `packages/gantt-lib/src/components/TaskRow/TaskRow.css` (renamed from TaskRow.module.css)
- `packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx`
- `packages/gantt-lib/src/components/TimeScaleHeader/index.tsx`
- `packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.css` (renamed from TimeScaleHeader.module.css)
- `packages/gantt-lib/src/components/GridBackground/GridBackground.tsx`
- `packages/gantt-lib/src/components/GridBackground/index.tsx`
- `packages/gantt-lib/src/components/GridBackground/GridBackground.css` (renamed from GridBackground.module.css)
- `packages/gantt-lib/src/components/TodayIndicator/TodayIndicator.tsx`
- `packages/gantt-lib/src/components/TodayIndicator/index.tsx`
- `packages/gantt-lib/src/components/TodayIndicator/TodayIndicator.css` (renamed from TodayIndicator.module.css)
- `packages/gantt-lib/src/components/DragGuideLines/DragGuideLines.tsx`
- `packages/gantt-lib/src/components/DragGuideLines/DragGuideLines.css` (renamed from DragGuideLines.module.css)
- `packages/gantt-lib/src/hooks/useTaskDrag.ts`
- `packages/gantt-lib/src/hooks/index.ts`
- `packages/gantt-lib/src/utils/dateUtils.ts`
- `packages/gantt-lib/src/utils/geometry.ts`
- `packages/gantt-lib/src/utils/index.ts`
- `packages/gantt-lib/src/types/index.ts`
- `packages/gantt-lib/src/__tests__/dateUtils.test.ts`
- `packages/gantt-lib/src/__tests__/geometry.test.ts`
- `packages/gantt-lib/src/__tests__/useTaskDrag.test.ts`

### Modified (CSS + TSX updates):
- All component .tsx files: Updated CSS imports from `import styles from './Component.module.css'` to `import './Component.css'`
- All component .tsx files: Replaced `styles.className` with string class names
- All component .css files: Renamed selectors to use prefixed class names

## Decisions Made

- Used git mv instead of copy + delete to preserve git file history
- Renamed .module.css to .css (plain CSS, no modules)
- Prefixed all CSS class names to avoid collisions when CSS is bundled globally
- Created styles.css aggregator with @import directives for tsup to emit
- Library index.ts imports styles.css to trigger tsup CSS emission
- Modal component excluded from library (website-only)
- Each component has its own CSS prefix:
  - `gantt-*` for GanttChart (4 classes)
  - `gantt-tr-*` for TaskRow (16 classes)
  - `gantt-tsh-*` for TimeScaleHeader (8 classes)
  - `gantt-gb-*` for GridBackground (6 classes)
  - `gantt-ti-*` for TodayIndicator (1 class)
  - `gantt-dgl-*` for DragGuideLines (1 class)

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

---

**Total deviations:** 0
**Impact on plan:** None - all tasks completed as specified

## Issues Encountered

None - all tasks completed as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Library source migration complete with all 26 files in packages/gantt-lib/src/
- CSS Modules converted to plain CSS with prefixed class names
- Library entry point and CSS aggregator created for tsup bundling
- Ready for 04-05: Build and verify the library package

---
*Phase: 04-npm-packaging*
*Completed: 2026-02-19*

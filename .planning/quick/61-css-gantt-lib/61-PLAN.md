# Quick Task 61: Устранить дублирование CSS файлов в gantt-lib

## Analysis

**Root cause:** `styles.css` contains inline copies of component styles that already live in per-component CSS files. Each component TSX already imports its own CSS. Additionally, `GanttChart.tsx` imports `TaskList.css` even though `TaskList.tsx` already does so.

**Duplications found:**
- `styles.css` inline → already in `GanttChart.css` (`.gantt-container`, `.gantt-scrollContainer`, `.gantt-stickyHeader`, `.gantt-taskArea`)
- `styles.css` inline → already in `TaskRow.css` (all `.gantt-tr-*` classes)
- `styles.css` inline → already in `TimeScaleHeader.css` (all `.gantt-tsh-*` classes)
- `styles.css` inline → already in `GridBackground.css` (all `.gantt-gb-*` classes)
- `styles.css` inline → already in `DragGuideLines.css` (`.gantt-dgl-guideLine`)
- `styles.css` `@import TaskList.css` → already imported by both `TaskList.tsx` AND `GanttChart.tsx`

**What's unique to styles.css:**
- CSS custom properties (`:root { ... }`) — the theming variables
- `@import './components/ui/ui.css'` — ui.css has no component-level TSX importer

## Tasks

### Task 1: Strip styles.css to variables + ui import only
- **File:** `packages/gantt-lib/src/styles.css`
- **Action:** Remove all inline component styles and the TaskList @import. Keep only: `:root` variables block + `@import './components/ui/ui.css'`
- **Verify:** File contains only `:root` block and the ui.css import

### Task 2: Remove duplicate TaskList.css import from GanttChart.tsx
- **File:** `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`
- **Action:** Remove the line `import '../TaskList/TaskList.css';` since TaskList.tsx already imports it
- **Verify:** GanttChart.tsx no longer imports TaskList.css

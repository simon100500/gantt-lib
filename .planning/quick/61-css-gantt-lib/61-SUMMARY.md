# Quick Task 61: Устранить дублирование CSS файлов в gantt-lib

**Status:** Completed
**Commit:** 5c07de7

## What was done

### Problem
`styles.css` содержал inline-копии стилей пяти компонентов:
- GanttChart (`.gantt-container`, `.gantt-scrollContainer`, `.gantt-stickyHeader`, `.gantt-taskArea`)
- TaskRow (все `.gantt-tr-*` классы)
- TimeScaleHeader (все `.gantt-tsh-*` классы)
- GridBackground (все `.gantt-gb-*` классы)
- DragGuideLines (`.gantt-dgl-guideLine`)

Каждый из этих компонентов уже импортировал свой CSS файл через TSX.
Дополнительно `GanttChart.tsx` импортировал `TaskList.css`, хотя `TaskList.tsx` уже делает это сам.

### Fix

**`styles.css`** — оставлено только то, что уникально:
- CSS custom properties (`:root { ... }`) — переменные темизации
- `@import './components/ui/ui.css'` — единственный CSS без компонентного TSX-импортера

**`GanttChart.tsx`** — удалён дублированный импорт `../TaskList/TaskList.css`

### Result
- `-251 строк` удалено (всё дублирование)
- Стили компонентов теперь живут исключительно в своих CSS файлах
- Единственная точка правды для каждого компонента

# Quick Task 95: сделать колонку процента уже и заменить широкое поле ввода на компактный shadcn-style инпут со степперами справа поверх поля

## Task 1
- files: `packages/gantt-lib/src/components/TaskList/TaskListRow.tsx`
- action: Replace the plain progress number input with a compact inline control based on the existing `Input`, with stepper buttons overlaid on the right edge.
- verify: Click opens the editor, stepper clicks adjust the value without closing the field, and Enter, blur, and Escape preserve existing save/cancel behavior.
- done: Progress editing uses a compact inline control instead of a full-width numeric field.

## Task 2
- files: `packages/gantt-lib/src/components/TaskList/TaskList.css`
- action: Reduce the progress column width and style the new compact editor, including internal steppers and hidden native number spinners.
- verify: The `%` column is visibly narrower while remaining readable and aligned with the current task list design.
- done: The progress column is tighter and visually polished.

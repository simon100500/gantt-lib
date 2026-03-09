# Phase 18: tasks-order - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Изменение порядка задач в списке задач (TaskList) — пользователь может менять визуальный порядок строк через drag-and-drop. TaskList и chart автоматически синхронизируются, так как используют один массив tasks.

</domain>

<decisions>
## Implementation Decisions

### Механизм переупорядочивания
- Drag-ручка (⋮⋮) появляется слева от № при hover на строку
- Захват за ручку инициирует перетаскивание всей строки
- HTML5 Drag and Drop API (без дополнительных зависимостей)
- Полупрозрачная копия строки (призрак) следует за курсором во время drag
- Escape отменяет перетаскивание — строка возвращается на исходную позицию

### Поведение колонки №
- Номера динамические: всегда 1, 2, 3... сверху вниз (отражают текущий порядок)
- Номера обновляются только после drop (onDrop) — не меняются во время перетаскивания
- Перетаскиваемая строка остаётся на исходной позиции (становится полупрозрачной) до drop
- Номер в перетаскиваемой строке остаётся обычным (без визуальных изменений)

### API / Callback
- `onReorder?: (tasks: Task[]) => void` — передаёт полный переупорядоченный массив
- onReorder вызывается только после завершения drag (onDrop)
- При отмене (Escape) onReorder НЕ вызывается — отработка на стороне UI
- Название пропа: onReorder (явно указывает на изменение порядка)

### Синхронизация TaskList и Chart
- Автоматическая синхронизация: TaskList и chart используют один массив tasks
- Scroll chart не меняется при переупорядочивании
- Перемещённая задача становится selected (выделяется) после drop
- Линии зависимостей автоматически перерисовываются для нового порядка задач

### Claude's Discretion
- Точный визуальный стиль drag-ручки (иконка, размер, отступы)
- Стилизация HTML5 drag ghost (стандартная или кастомная через setDragImage)
- Анимация вставки строки на новую позицию

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TaskList/TaskList.tsx`: Компонент для добавления drag-ручки и обработки drag events
- `TaskList/TaskListRow.tsx`: Hover-паттерн для показа drag-ручки (аналогично trash-кнопке из Phase 42-44)
- `GanttChart/GanttChart.tsx`: Текущий selectedTaskId state и onTaskSelect callback — использовать для выделения перемещённой задачи
- `DependencyLines/DependencyLines.tsx`: Автоматическая перерисовка линий при изменении порядка (уже работает)

### Established Patterns
- Hover-показ UI элементов: `.gantt-tl-row:hover .drag-handle { opacity: 1; }` (Phase 59)
- Controlled component: библиотека не хранит tasks — вся мутация через callback → setState у потребителя
- CSS-префикс `gantt-tl-` для всех стилей TaskList
- HTML5 DnD API: draggable={true}, onDragStart, onDragOver, onDrop, onDragEnd

### Integration Points
- `GanttChart` props: добавить `onReorder?: (tasks: Task[]) => void` в `GanttChartProps`
- `TaskList` props: получает `onReorder` от GanttChart, рендерит drag-ручки и обрабатывает drag events
- `TaskListRow`: расширить для drag-ручки (draggable, drag events, drag-handle)
- После drop: вызвать onReorder с новым массивом + onTaskSelect для перемещённой задачи

</code_context>

<specifics>
## Specific Ideas

- Drag-ручка (⋮⋮) — иконка из 6 точек или two-line grip icon, появляется слева от № при hover
- Призрак-строка — стандартное поведение HTML5 DnD (или setDragImage для кастомизации)
- Перетаскиваемая строка становится opacity: 0.5 во время drag

</specifics>

<deferred>
## Deferred Ideas

- Кнопки ↑/↓ для keyboard navigation — future phase
- Множественный выбор и перемещение группы задач — future phase
- Drag-reordering напрямую в chart (не только в TaskList) — future phase

</deferred>

---

*Phase: 18-tasks-order*
*Context gathered: 2026-03-09*

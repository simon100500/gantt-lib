# Phase 16: adding-tasks - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Добавление и удаление задач через UI диаграммы Ганта. Пользователь может создать новую задачу кнопкой в панели TaskList и удалить существующую. Редактирование полей существующих задач — уже реализовано в предыдущих фазах.

</domain>

<decisions>
## Implementation Decisions

### Точка входа (добавление)
- Кнопка «+ Добавить задачу» в нижней части панели TaskList (отдельная строка под списком задач)
- Кнопка доступна только когда `showTaskList=true` — добавление задач без панели не предусмотрено
- После нажатия: новая строка сразу появляется в режиме редактирования имени (фокус в input)
- Enter — сохранить задачу, Escape — отменить создание (строка исчезает)

### Значения по умолчанию
- `name` = '' (пустая строка, input показывает placeholder «Название»)
- `startDate` = сегодня (UTC)
- `endDate` = сегодня + 7 дней (UTC)
- `color` = нейтральный (серый, без акцента)
- `id` = генерируется библиотекой через `crypto.randomUUID()`
- Задача добавляется в конец списка

### Удаление задач
- Иконка корзины (trash) появляется по hover на строке TaskList (справа)
- Паттерн совпадает с trash-кнопкой на чипах зависимостей (Phase 14)
- При удалении все зависимости, где задача фигурирует как predecessor, удаляются автоматически библиотекой (очистка перед вызовом callback)

### API / Callbacks
- `onAdd?: (task: Task) => void` — вызывается после подтверждения имени (Enter/blur), передаёт полный объект задачи с ID
- `onDelete?: (taskId: string) => void` — вызывается после клика на trash, передаёт id удалённой задачи
- Оба callback опциональные; если не переданы — кнопки скрыты (disableTaskEditing паттерн)
- Родительский компонент добавляет/удаляет из своего массива `tasks` через setState

### Claude's Discretion
- Точный визуальный стиль кнопки «+ Добавить задачу» (иконка, цвет, размер)
- Поведение blur без ввода имени (вероятно, отменить создание как Escape)
- CSS-класс и расположение trash-кнопки в строке

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TaskList/TaskListRow.tsx`: Существующий паттерн inline-редактирования имени (useState + useEffect для auto-focus, Enter/blur сохраняет, Escape отменяет) — использовать для новой строки
- `TaskList/TaskList.tsx`: Компонент для добавления кнопки внизу; уже управляет selectedTaskId и пикер-режимом
- `GanttChart/GanttChart.tsx`: forwardRef + useImperativeHandle уже используется (scrollToTask) — при необходимости можно расширить
- `components/ui/Button.tsx`: Готовая Button-компонент для кнопки «+ Добавить»
- Trash-иконка: уже используется в DepChip (Phase 42-44 quick tasks) — переиспользовать SVG

### Established Patterns
- `onAdd`/`onDelete` по аналогии с `onChange`/`onCascade` — опциональные callback-пропсы в GanttChart
- CSS-префикс `gantt-tl-` для всех стилей TaskList
- Hover-показ trash: паттерн из Phase 59 (resize handles по hover) и quick task 42 (dep chip trash)
- Controlled component: библиотека не хранит tasks — вся мутация через callback → setState у потребителя
- `crypto.randomUUID()` — нативный браузерный API, без зависимостей

### Integration Points
- `GanttChart` props: добавить `onAdd` и `onDelete` в `GanttChartProps`
- `TaskList` props: получает `onAdd`/`onDelete` от GanttChart, рендерит кнопку и trash
- `TaskListRow`: расширить для состояния «новая строка в режиме создания» (отличается от редактирования существующей)
- Автоочистка зависимостей при удалении: фильтрация в GanttChart перед вызовом `onDelete` — все tasks проверяются на упоминание удалённого taskId в `dependencies`

</code_context>

<specifics>
## Specific Ideas

- Кнопка «+ Добавить задачу» — полноширинная строка под списком, стиль как у существующих строк но с пунктирной границей или иным визуальным намёком
- Trash появляется справа при hover на строку — как иконка корзины в dep chips

</specifics>

<deferred>
## Deferred Ideas

None — обсуждение осталось в рамках фазы.

</deferred>

---

*Phase: 16-adding-tasks*
*Context gathered: 2026-03-08*

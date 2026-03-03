# Phase 15: expired-coloring - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Добавить подсветку просроченных задач красным цветом. Задача считается просроченной если endDate < today AND (progress < 100% OR not accepted). Визуальный стиль — красный фон всего task bar. Глобальный переключатель `highlightExpiredTasks?: boolean` на компоненте GanttChart.
</domain>

<decisions>
## Implementation Decisions

### Логика определения просрочки
Задача считается просроченной если выполняются ВСЕ условия:
- `endDate < today` — дата окончания уже прошла
- И одно из:
  - `progress < 100%` — задача не выполнена полностью
  - `accepted !== true` — задача не принята

То есть: если задача выполнена на 100% И принята — она НЕ просрочена даже если дата прошла.

### Визуальный стиль
- **Красный фон** всего task bar (backgroundColor)
- Фон полностью заменяет исходный цвет задачи (task.color)
- Прогресс-бар и текст остаются поверх красного фона
- Красный цвет: настраиваемая CSS переменная `--gantt-expired-color` (по умолчанию #ef4444)

### Взаимодействие с прогрессом
- **Бинарная логика** — либо красный, либо нет
- Процент выполнения НЕ влияет на интенсивность красного
- 10% выполнено и 90% выполнено — одинаковый красный если просрочена

### API переключателя
- Пропс: `highlightExpiredTasks?: boolean`
- Расположение: компонент `GanttChart` (не TaskRow)
- Значение по умолчанию: `false` (выключено по умолчанию для обратной совместимости)
- Передаётся вниз в `TaskRow` через props

### Claude's Discretion
- Точное значение красного цвета по умолчанию (#ef4444 или другой оттенок)
- z-index и порядок слоёв если красный фон перекрывает другие элементы
-_transition_ анимация при изменении статуса просрочки (плавная или мгновенная)
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TaskRow.tsx` — сюда добавляется логика определения просрочки и применение красного фона
- `parseUTCDate()` из `dateUtils.ts` — уже используется для парсинга дат, переиспользовать
- CSS переменные в `styles.css` — добавить `--gantt-expired-color`
- `arePropsEqual` в `TaskRow.tsx` — добавить `highlightExpiredTasks` в сравнение пропсов

### Established Patterns
- Цвет task bar задаётся через `style={{ backgroundColor: ... }}`
- CSS переменные используются для всех настраиваемых цветов
- Пропсы с GanttChart передаются в TaskRow (например, `dayWidth`, `rowHeight`, `monthStart`)
- Булевы пропсы-переключатели: `disableDependencyEditing`, `disableTaskNameEditing` — следовать паттерну `highlightExpiredTasks`

### Integration Points
- `GanttChart.tsx` — добавить проп `highlightExpiredTasks`, передать в `TaskRow`
- `TaskRow.tsx` — вычислить `isExpired`, применить красный фон если `highlightExpiredTasks && isExpired`
- `styles.css` — добавить CSS переменную `--gantt-expired-color`
- `TaskRow.css` — можно добавить класс `.gantt-tr-taskBar.gantt-tr-expired` для избежания инлайн-стилей (на усмотрение)
</code_context>

<specifics>
## Specific Ideas

- Красный цвет такой же как для циклических зависимостей (`--gantt-dependency-cycle-color: #ef4444`) или отдельный оттенок
- Сегодняшняя дата (`today`) вычисляется внутри компонента, не передаётся как проп
- Задачи без свойства `progress` считаются как `progress = 0` для расчёта просрочки
- Задачи без свойства `accepted` считаются как `accepted = false`
</specifics>

<deferred>
## Deferred Ideas

- Интенсивность красного в зависимости от процента выполнения (gradual red) — отдельная фаза
- Отдельный цвет для "просрочено но почти выполнено" (например, оранжевый) — отдельная фаза
- Визуальный индикатор просрочки в task list (значок или цвет текста) — отдельная фаза
</deferred>

---

*Phase: 15-expired-coloring*
*Context gathered: 2026-03-03*

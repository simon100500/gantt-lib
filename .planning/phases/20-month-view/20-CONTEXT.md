# Phase 20: month-view - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Добавить масштаб «по неделям» (week-view) — альтернативный режим просмотра Gantt-диаграммы, где каждый столбец = 1 неделя. Переключение через пропс `viewMode`. Режим «по дням» (существующий) остаётся без изменений.

</domain>

<decisions>
## Implementation Decisions

### API переключателя
- Пропс `viewMode?: 'day' | 'week'`, значение по умолчанию `'day'`
- Без встроенного UI-переключателя — родительский компонент управляет состоянием сам
- При отсутствии пропса поведение не меняется (обратная совместимость)

### Единица сетки в week-view
- Каждый столбец = 1 неделя
- Ширина столбца = `dayWidth × 7` (используется тот же пропс `dayWidth`, что в day-view)
- При dayWidth=7px неделя = 49px; рекомендуемое значение dayWidth для week-view ~7–8px

### Заголовок в week-view (2 строки)
- **Строка 1**: название месяца + год («Март 2026»), спан по неделям этого месяца
- **Строка 2**: дата начала недели — число месяца (01, 08, 15, 22, 29…)
- Высота заголовка аналогична day-view (`headerHeight` пропс)

### Перетаскивание в week-view
- Drag-and-drop работает в полной мере
- Привязка к дню — смещение вычисляется из пиксельной позиции через `dayWidth`
- Даты сохраняются точно, без округления до начала недели

### Сетка week-view
- Тонкие вертикальные линии между неделями (аналогично разделителям дней в day-view)
- Яркие разделители на границах месяцев (аналогично текущим разделителям месяцев)
- Вертикальная линия сегодняшнего дня (TodayIndicator адаптируется к week-view)
- Выходные дни не выделяются (нет подсветки, т.к. столбец = неделя)

### Claude's Discretion
- Обработка «неполных» недель на границах месяцев (первая/последняя неделя)
- Точный CSS для разделителей месяцев в week-view
- Адаптация TodayIndicator под недельную ширину столбца

</decisions>

<specifics>
## Specific Ideas

- «month-view» — рабочее название фазы; реальный масштаб — недельный (week-view)
- Режим нужен для долгосрочного планирования (многолетние проекты) где day-view слишком детализирован
- Строка 2 заголовка показывает начало каждой недели числом месяца: 01, 08, 15, 22, 29

</specifics>

<canonical_refs>
## Canonical References

Внешних спецификаций нет — требования полностью зафиксированы в секции decisions выше.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **TimeScaleHeader** (`packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx`) — текущий 2-строчный заголовок; нужно добавить branch для week-view
- **GridBackground** (`packages/gantt-lib/src/components/GridBackground/`) — вертикальные линии и выходные; нужно адаптировать под недельный шаг
- **TodayIndicator** (`packages/gantt-lib/src/components/TodayIndicator/`) — вертикальная линия сегодняшнего дня; должна корректно позиционироваться в week-view
- **dateUtils.ts** (`packages/gantt-lib/src/utils/dateUtils.ts`) — `getMultiMonthDays`, `getMonthSpans`, `parseUTCDate`; нужны новые утилиты для недельного разбиения

### Established Patterns
- **dayWidth пропс** — текущий механизм масштабирования; в week-view столбец = dayWidth × 7
- **UTC-safe даты** — `parseUTCDate`, все Date в UTC, сохранять этот паттерн
- **CSS переменные** `gantt-*` префикс для всех стилей
- **React.memo** — используется в TaskRow и других компонентах для оптимизации

### Integration Points
- **GanttChart** — добавить `viewMode` пропс, передавать в TimeScaleHeader, GridBackground, TodayIndicator
- **useTaskDrag hook** — drag вычисляет смещение через `dayWidth`; в week-view формула остаётся, т.к. привязка к дню
- **getMultiMonthDays** — генерирует массив дней для всего диапазона; в week-view используется тот же массив, но шаг рендера = 7 дней

### Новые утилиты (нужно создать)
- `getWeekSpans(days)` — аналог `getMonthSpans`, но группирует дни по неделям
- Возможно `getWeekStartDays(days)` — возвращает первые дни каждой недели для заголовка строки 2

</code_context>

<deferred>
## Deferred Ideas

- Масштаб «квартал» / «год» (каждый столбец = квартал или месяц) — потенциальная следующая фаза
- Полноценный switcher с 3+ масштабами (день / неделя / месяц / квартал) — более крупная задача
- Зум колёсиком мыши для плавного переключения масштабов — отдельная фаза

</deferred>

---

*Phase: 20-month-view*
*Context gathered: 2026-03-15*

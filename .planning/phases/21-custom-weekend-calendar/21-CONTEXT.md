# Phase 21: Custom Weekend Calendar - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Пользовательские выходные дни — возможность задавать кастомные даты выходных (праздники) и исключать стандартные выходные (делать их рабочими днями). Расширение затрагивает GridBackground, TimeScaleHeader и DatePicker.
</domain>

<decisions>
## Implementation Decisions

### API пропсов
- Добавить два пропса в `GanttChart`:
  - `weekends?: Date[]` — массив дат для добавления к выходным (праздники)
  - `workdays?: Date[]` — массив дат для исключения из выходных (делать рабочими)
- При передаче обоих пропсов: `workdays` имеет приоритет над `weekends` (если дата есть в обоих — она рабочий день)
- Если ни один пропс не передан — поведение по умолчанию (суббота + воскресенье)

### Сравнение дат
- Сравнение по UTC: `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`
- Не использовать локальное время (избегаем проблем с часовыми поясами)
- Соответствует текущей логике в `calculateWeekendBlocks`

### Рендер подсветки в GridBackground
- Кастомные выходные подсвечиваются **только в day-view**
- В week/month-view подсветка кастомных выходных не отображается (как с обычными выходными)
- Цвет подсветки: pink/red (#FCC/#FDD) — соответствует текущим выходным

### TimeScaleHeader
- Числа выходных дней в заголовке красим красным/розовым цветом
- Применяется ко всем view modes где показываются числа (day-view)
- Цвет настраивается через CSS variables

### DatePicker (shadcn/ui)
- Визуально отметить выходные дни цветом
- Выбор дат разрешён (не блокировать)
- Добавить пропс для передачи weekend/workdays дат

### Claude's Discretion
- Точные hex-коды для цветов в TimeScaleHeader и DatePicker
- Детали реализации визуальной отметки в DatePicker (CSS класс vs inline styles)
- Обработка edge cases (пустые массивы, невалидные даты)
</decisions>

<specifics>
## Specific Ideas

- Пользователь может загрузить праздники с API до рендера и передать готовый массив
- Нужна возможность исключать конкретные субботы/воскресенья (переносы выходных)
- Пример: 8 марта — выходной, суббота 15 марта — рабочий день
</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Требования
- `.planning/REQUIREMENTS.md` — CAL-01 to CAL-05 (Custom Weekend Calendar requirements)

### Предыдущие фазы (контекст)
- `.planning/phases/03-calendar/03-CONTEXT.md` — текущая логика подсветки выходных (розовый #FCC/#FDD)
- `.planning/phases/20-month-view/20-CONTEXT.md` — отсутствие подсветки в week/month-view

### Внешние спецификации
Нет внешних спецификаций — требования полностью зафиксированы в REQUIREMENTS.md
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`calculateWeekendBlocks`** (`packages/gantt-lib/src/utils/geometry.ts:162-196`) — текущая логика определения выходных (Sunday/Saturday), нужно адаптировать под кастомные даты
- **`GridBackground`** (`packages/gantt-lib/src/components/GridBackground/GridBackground.tsx`) — рендерит блоки выходных через `gantt-gb-weekendBlock` класс
- **`TimeScaleHeader`** (`packages/gantt-lib/src/components/TimeScaleHeader/`) — 2-строчный заголовок с числами дней
- **DatePicker** (`packages/gantt-lib/src/components/ui/DatePicker.tsx`) — shadcn/ui компонент для выбора дат

### Established Patterns
- **UTC-safe даты** — все операции используют `getUTC*` методы, `parseUTCDate`
- **Props flow** — GanttChart → GridBackground/TimeScaleHeader через props
- **CSS variables** — префикс `gantt-*` для всех стилей
- **React.memo** — оптимизация рендера GridBackground

### Integration Points
- **GanttChart** — добавить пропсы `weekends?`, `workdays?` в `GanttChartProps` интерфейс
- **GridBackground** — передать кастомные выходные для рендера блоков
- **TimeScaleHeader** — передать кастомные выходные для покраски чисел
- **DatePicker** — добавить проп для отметки выходных дней
</code_context>

<deferred>
## Deferred Ideas

Нет отложенных идей — обсуждение осталось в рамках фазы.
</deferred>

---

*Phase: 21-custom-weekend-calendar*
*Context gathered: 2026-03-18*

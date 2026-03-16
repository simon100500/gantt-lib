# Quick Task 260316-m0r: Добавить представление "месяц" - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Task Boundary

Добавить viewMode='month' по аналогии с существующим viewMode='week'.
- Шапка (TimeScaleHeader): 2 уровня — строка 1: год, строка 2: месяц
- GridBackground: тонкие линии = разделитель месяца, толстые = разделитель года
- Snap: остаётся к дню (без изменений в логике snap)
- Пропс: расширить тип `viewMode?: 'day' | 'week'` → `'day' | 'week' | 'month'`

</domain>

<decisions>
## Implementation Decisions

### Формат метки месяца (строка 2 заголовка)
- Сокращённое название: "Jan", "Feb", "Mar" (аналогично `date.toLocaleString('en', {month: 'short'})`)
- Показывать усечённо если месяц неполный (аналог week mode для недель < 7 дней)

### Формат метки года (строка 1 заголовка)
- Только число: "2025", "2026" — без суффиксов

### Неполные месяцы на краях
- Показывать усечённо (как в day/week mode)
- **Примечание пользователя:** диапазон у нас всегда кратен целому месяцу, так что edge case маловероятен, но реализовать корректно всё равно надо

### Выходные блоки
- Отключить в month mode (как в week mode — в месячном масштабе не имеют смысла)

### Claude's Discretion
- Точный порог скрытия метки в узкой колонке (аналог week mode: скрывать если блок < N дней)
- Реализация в website/page.tsx: добавить кнопку "По месяцам" и рекомендуемый dayWidth (~3-4px/день)
- CSS классы: использовать существующий паттерн (добавить monthViewCell и т.п.)

</decisions>

<specifics>
## Specific Ideas

- Аналог `getWeekBlocks` → `getMonthBlocks(days)`: возвращает блоки по месяцам (возможно просто сгруппировать по месяцам, без разбиения т.к. граница уже на 1-е число)
- Аналог `getWeekSpans` → `getYearSpans(days)`: группирует месяцы по годам
- Аналог `calculateWeekGridLines` → `calculateMonthGridLines(dateRange, dayWidth)`: тонкая линия на каждом 1-м числе месяца, толстая на 1 января
- В TimeScaleHeader условная логика: `viewMode === 'month'` добавляется к существующим `viewMode === 'week'` веткам

</specifics>

<canonical_refs>
## Canonical References

- `packages/gantt-lib/src/components/TimeScaleHeader/TimeScaleHeader.tsx` — эталон для шапки week view
- `packages/gantt-lib/src/components/GridBackground/GridBackground.tsx` — эталон для линий week view
- `packages/gantt-lib/src/utils/dateUtils.ts` — `getWeekBlocks`, `getWeekSpans` — прямые аналоги
- `packages/gantt-lib/src/utils/geometry.ts` — `calculateWeekGridLines` — эталон для month grid lines

</canonical_refs>

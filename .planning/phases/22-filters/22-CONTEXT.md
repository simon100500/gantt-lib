# Phase 22: Filters - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning
**Source:** PRD Express Path (d:\Projects\gantt-lib\.planning\filters-add.md)

<domain>
## Phase Boundary

Фильтрация задач в GanttChart по различным критериям с визуальным отображением. Зависимости должны пересчитываться для ВСЕХ задач (включая скрытые фильтром) при любых изменениях.

</domain>

<decisions>
## Implementation Decisions

### Архитектурный подход
- **Predicate-based с готовыми утилитами** (Вариант 3)
- Пользовательский предикат: `(task: Task) => boolean`
- Экспорт из `gantt-lib/filters`: булевы композиты и готовые фильтры

### API дизайн
```tsx
import { and, or, not, withoutDeps, expired, inDateRange, progressInRange, nameContains } from 'gantt-lib/filters';

<GanttChart
  tasks={tasks}
  taskFilter={and(withoutDeps(), expired())}
/>
```

### Новые файлы
- `packages/gantt-lib/src/filters/index.ts` — все фильтры и композиты

### Изменения в GanttChart
- Добавить проп `taskFilter?: TaskPredicate`
- Добавить расчёт `matchedTaskIds` поверх `visibleTasks`, чтобы taskFilter подсвечивал совпавшие строки
- Зависимости пересчитываются на `normalizedTasks` (все задачи), а не на highlight-набор

### Готовые фильтры
1. `withoutDeps()` — задачи без dependencies
2. `expired(referenceDate?)` — просроченные задачи
3. `inDateRange(start, end)` — задачи пересекающие диапазон
4. `progressInRange(min, max)` — задачи с прогрессом в диапазоне
5. `nameContains(substring, caseSensitive?)` — задачи по подстроке в названии

### Булевы композиты
- `and(...predicates)` — все предикаты истинны
- `or(...predicates)` — хотя бы один предикат истинен
- `not(predicate)` — инверсия предиката

### Публичный API
- Экспорт из `packages/gantt-lib/src/index.ts`: `export * from './filters'`
- Тип `TaskPredicate` доступен пользователям для кастомных фильтров

### Claude's Discretion
- Точное расположение типов (TaskPredicate в filters/index.ts или types/index.ts)
- Обработка edge cases в фильтрах (null dates, undefined progress)
- Тесты: добавить базовые тесты для фильтров или опустить

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Требования к фильтрации
- `.planning/filters-add.md` — Полная спецификация фильтрации, архитектурное решение, примеры использования

### Связанные компоненты
- `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` — логика visibleTasks и taskFilter highlight
- `packages/gantt-lib/src/types/index.ts` — Тип Task для понимания структуры
- `packages/gantt-lib/src/index.ts` — Публичные экспорты библиотеки

</canonical_refs>

<specifics>
## Specific Ideas

### Ключевое требование
> "фильтрация должна быть визуальной — при сдвижке задачи библиотека должна пересчитывать зависимости ВСЕХ задач, включая скрытые"

### Обработка прогресса
- `progressInRange` использует `task.progress ?? 0` для undefined значений

### Поиск по названию
- `nameContains` по умолчанию case-insensitive
- Параметр `caseSensitive` для точного matching

### Пересечение диапазонов дат
- Задача пересекает диапазон если: `taskStart <= rangeEnd && taskEnd >= rangeStart`

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GanttChart.visibleTasks` и `matchedTaskIds` useMemo — паттерн мемоизации видимых и подсвеченных задач
- `collapsedParentIds` Set — существующий паттерн фильтрации по ancestors

### Established Patterns
- Разделение ответственности: collapsed parent управляет видимостью, taskFilter управляет подсветкой
- Зависимости работают с `normalizedTasks` (полный список)

### Integration Points
- `GanttChart.tsx` — добавить проп `taskFilter` в интерфейс
- `src/index.ts` — добавить `export * from './filters'`

</code_context>

<deferred>
## Deferred Ideas

None — PRD covers phase scope

</deferred>

---

*Phase: 22-filters*
*Context gathered: 2026-03-18 via PRD Express Path*

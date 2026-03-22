# Quick Task 260322-oi0: Добавить возможность скрытия тасклиста отдельно от календаря

**Дата:** 2026-03-22
**Статус:** Завершено

## Что было сделано

### 1. Добавлен проп `showChart` в GanttChart
- Файл: `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`
- Новый проп `showChart?: boolean` (default: `true`)
- Добавлен в интерфейс `GanttChartProps` с документацией
- Chart area обёрнут в условный CSS-класс

### 2. Добавлены CSS стили для скрытия chart area
- Файл: `packages/gantt-lib/src/components/GanttChart/GanttChart.css`
- Создан класс `.gantt-chart-hidden` с плавной анимацией
- При `showChart={false}` календарная сетка скрывается

## Результат

Теперь можно независимо управлять видимостью:
- `showTaskList={false} showChart={true}` — только календарь
- `showTaskList={true} showChart={false}` — только тасклист
- `showTaskList={true} showChart={true}` — оба вместе (по умолчанию)

## Коммиты
- `77936d9` feat(quick-260322-oi0): add showChart prop to GanttChartProps
- `f06f820` feat(quick-260322-oi0): add CSS styles for hiding chart area

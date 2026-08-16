# Дизайн: Подсветка и фильтрация критического пути

Дата: 2026-08-16
Статус: утверждён на брейншторме

## Проблема

В Gantt-диаграмме нет способа показать критический путь — цепочку работ, определяющих
минимальную длительность проекта. Пользователю нужно:

1. Визуально выделить критические работы (цвет барров) и связи между ними (линии).
2. Отфильтровать проект — скрыть некритичные работы.

## Решения, принятые на брейншторме

| Вопрос | Решение |
|---|---|
| Кто вычисляет критичность | Библиотека сама (CPM внутри) |
| Какие задачи участвуют | Листовые работы + вехи; родители наследуют критичность от критичных потомков |
| Какие связи учитываются | Только FS с лагами; SS/FF/SF игнорируются |
| Единицы длины пути | Длительность в рабочих днях, лаги календарно |
| Форма API | Один пропс `criticalPathMode?: 'highlight' \| 'hide'` |
| Визуализация | Цвет барров + подсветка линий-зависимостей |
| Путь без связей | Пуст; несколько путей макс. длины — все критичны |
| Цвет | CSS-переменная `--gantt-critical-path-color`; expired приоритетнее |
| Область применения | Только классический gantt-режим (не table-matrix/plan-fact/resource-planner) |

## Архитектура

### 1. Новый модуль `core/scheduling/criticalPath.ts`

Чистый runtime-agnostic модуль (без React/DOM/date-fns), как остальной core.

```ts
computeCriticalPath(
  tasks: ScheduleTask[],
  opts: { businessDays?: boolean; weekendPredicate?: (d: Date) => boolean }
): Set<string> // критические id ЛИСТОВЫХ задач
```

Алгоритм (CPM):
- Граф строится из листовых задач (нет детей) — `type: 'task' | 'milestone'`.
  Родительские задачи в граф не входят (их даты выводятся из детей и искажают длину пути).
- Учитываются только FS-связи (`type === 'FS'`) с лагом. SS/FF/SF игнорируются.
- Все вычисления ведутся на абстрактной шкале дней. Вес задачи = её длительность
  в **рабочих днях** (`getTaskDuration` с `weekendPredicate`). Вес дуги = лаг
  в **календарных днях** (`getDependencyLag`, default 0).
- **Forward pass** по топологическому порядку:
  `ES = max(0, ES_pred + duration_pred + lag)` по всем FS-предшественникам;
  `EF = ES + duration`. Задачи без предшественников: `ES = 0`.
- **Backward pass** от задач без последователей (их `LF = EF`) вниз:
  `LF = min(LF_succ - lag)`, `LS = LF - duration`.
- **Float** = LS − ES. Задача критична при `float === 0`.
- Собственные даты задач (`startDate`) задают порядок обхода, но не участвуют
  в длине пути — длина определяется весами (рабочие дни + календарные лаги).
- Изолированные задачи (нет связей) — не критичны.
- Несколько путей одинаковой максимальной длины — все критичны (естественное
  следствие `float === 0`).

Возвращает Set id **листовых** задач.

### 2. Наследование родителям

В GanttChart листовые id поднимаются по `parentId` вверх: родитель критичен, если
критичен любой его потомок. Итоговый `criticalTaskIds: Set<string>` покрывает все
уровни иерархии.

### 3. Пропс

В `GanttModeProps` (не в общем `TaskChartSharedProps`, т.к. фича работает только
в gantt-режиме):

```ts
criticalPathMode?: 'highlight' | 'hide';
```

- `undefined` (по умолчанию) — выключено, поведение не меняется;
- `'highlight'` — подсветка барров и линий-зависимостей критических задач;
- `'hide'` — скрыть некритичные задачи (остаются критические + их предки-родители,
  чтобы не ломалась иерархия).

В table-matrix/plan-fact/resource-planner пропс игнорируется.

## Интеграция

### GanttChart

- `criticalTaskIds` — `useMemo` на `normalizedTasks`, `businessDays`, `isCustomWeekend`.
  Вызов `computeCriticalPath` по листьям `normalizedTasks` + подъём по `parentId`.
- `visibleTasks` (существующий `useMemo`): при `criticalPathMode === 'hide'` —
  оставить только задачи из `criticalTaskIds` (в них уже включены предки).
  Фильтр по коллапсу применяется как раньше.
- Передача `isCritical` в `TaskRow` и `criticalTaskIds` в `DependencyLines`.
- `matchedTaskIds`/`taskListHighlightedTaskIds` не затрагиваются (это механизм
  `taskFilter`); критический путь не мешается с пользовательским фильтром.

### TaskRow

Новый пропс `isCritical?: boolean`. При `true` барр красится в
`var(--gantt-critical-path-color, #dc2626)` через существующую логику выбора цвета
(`barColor`). Приоритет: `isExpired` (существующая красная подсветка) побеждает —
уже заложено порядком вычисления `barColor` (сначала expired).

### DependencyLines

Новый пропс `criticalTaskIds?: Set<string>`. Линия подсвечивается классом
`.gantt-dependency-critical` (цвет `--gantt-critical-path-color`), когда оба конца
(предшественник и последователь) критичны. Приоритет стилей:
selected > cycle > critical.

### CSS

В `styles.css` в `:root`:

```css
--gantt-critical-path-color: #dc2626;
```

Класс `.gantt-dependency-critical` в `DependencyLines.css` — stroke +
соответствующий `arrowhead` (переиспользуем существующий паттерн selected/cycle).

## Обработка ошибок и крайние случаи

- **Циклы в FS-графе**: `computeCriticalPath` защищается от зависания
  (множество посещённых + лимит итераций). Пути с циклом не ломают UI.
- **Пустой проект / нет листьев / нет связей**: пустой `Set`, ничего не подсвечивается
  и не скрывается.
- **Даты**: парсятся `parseUTCDate` (общий парсер библиотеки).
- **Лаг**: `getDependencyLag` (default 0), как в остальном core.

## Тестирование

### Unit: `criticalPath.test.ts` (в `core/scheduling/__tests__/`)

1. Простой линейный путь A→B→C: все три критичны.
2. Параллельные ветки: критична самая длинная.
3. Несколько путей равной длины: все критичны.
4. Лаги: положительный лаг удлиняет путь, отрицательный сокращает.
5. Вехи в пути: участвуют как листья.
6. Изолированные задачи: не критичны.
7. Цикл: не зависает, критичность не падает.
8. Родительские задачи исключены из графа.

### Наследование: подъём по parentId

9. Родитель критичен, если критичен любой потомок; иначе — нет.

### Интеграция (`.tsx`, gantt-режим)

10. `criticalPathMode='highlight'`: критические барры и линии подсвечены, некритичные нет.
11. `criticalPathMode='hide'`: некритичные скрыты, предки критичных сохранены.
12. Приоритет expired над critical (барр остаётся красным просроченным).
13. Пропс живёт в `GanttModeProps` — в table-matrix/plan-fact его не принять на уровне типов;
    сущ. тесты этих режимов проходят без изменений (регрессия отсутствует).

## Файлы

- Новые: `core/scheduling/criticalPath.ts`, `core/scheduling/__tests__/criticalPath.test.ts`.
- Изменяемые:
  - `components/GanttChart/GanttChart.tsx` (пропс, `criticalTaskIds`, `visibleTasks`, передача в TaskRow/DependencyLines);
  - `components/TaskRow/TaskRow.tsx` (пропс `isCritical`, цвет барра, `arePropsEqual`);
  - `components/DependencyLines/DependencyLines.tsx` (пропс `criticalTaskIds`, класс линии, `arrowhead`);
  - `components/DependencyLines/DependencyLines.css` (`.gantt-dependency-critical`);
  - `styles.css` (`--gantt-critical-path-color`).

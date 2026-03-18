# Фильтрация задач в GanttChart

## Контекст

Пользователь хочет фильтровать задачи по различным критериям:
1. Задачи без связей (dependencies)
2. Просроченные задачи
3. Фильтр по датам (диапазон)
4. Фильтр по прогрессу
5. Фильтр по названию

**Ключевое требование:** фильтрация должна быть визуальной — при сдвижке задачи библиотека должна пересчитывать зависимости ВСЕХ задач, включая скрытые.

## Архитектурное решение

**Подход:** Predicate-based с готовыми утилитами (вариант 3)

```tsx
import { and, or, not, withoutDeps, expired, inDateRange, progressInRange, nameContains } from 'gantt-lib/filters';

<GanttChart
  tasks={tasks}
  taskFilter={and(withoutDeps(), expired())}
/>
```

### Почему этот подход?

1. **Расширяемость** — пользователь может написать свой предикат без ожидания релиза
2. **Композиция** — комбинации через `and`, `or`, `not`
3. **Чистота** — логика фильтрации изолирована от рендеринга
4. **Аналогия** — уже есть `filteredTasks` для collapsed parent IDs

## План реализации

### 1. Создать файл `packages/gantt-lib/src/filters/index.ts`

Экспортирует:
- Булевы композиты: `and`, `or`, `not`
- Готовые фильтры: `withoutDeps`, `expired`, `inDateRange`, `progressInRange`, `nameContains`
- Тип `TaskPredicate`

```ts
export type TaskPredicate = (task: Task) => boolean;

export const and = (...predicates: TaskPredicate[]): TaskPredicate => { ... }
export const or = (...predicates: TaskPredicate[]): TaskPredicate => { ... }
export const not = (predicate: TaskPredicate): TaskPredicate => { ... }

export const withoutDeps = (): TaskPredicate => { ... }
export const expired = (referenceDate?: Date): TaskPredicate => { ... }
export const inDateRange = (start: Date, end: Date): TaskPredicate => { ... }
export const progressInRange = (min: number, max: number): TaskPredicate => { ... }
export const nameContains = (substring: string, caseSensitive?: boolean): TaskPredicate => { ... }
```

### 2. Обновить `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx`

Добавить проп:
```ts
export interface GanttChartProps {
  // ... существующие пропсы
  /** Optional predicate to filter tasks for display. Dependencies are still computed on ALL tasks. */
  taskFilter?: TaskPredicate;
}
```

Обновить `filteredTasks` useMemo:
```ts
const filteredTasks = useMemo(() => {
  const parentMap = new Map(normalizedTasks.map(t => [t.id, t.parentId]));

  function isAnyAncestorCollapsed(parentId: string | undefined): boolean {
    let current = parentId;
    while (current) {
      if (collapsedParentIds.has(current)) return true;
      current = parentMap.get(current);
    }
    return false;
  }

  // Сначала фильтруем по collapsed parent
  let result = normalizedTasks.filter(task => !isAnyAncestorCollapsed(task.parentId));

  // Затем применяем taskFilter если есть
  if (taskFilter) {
    result = result.filter(taskFilter);
  }

  return result;
}, [normalizedTasks, collapsedParentIds, taskFilter]);
```

### 3. Обновить `packages/gantt-lib/src/index.ts`

Добавить экспорт фильтров:
```ts
export * from './filters';
```

### 4. Обновить типы в `packages/gantt-lib/src/types/index.ts`

Добавить `TaskPredicate` если нужно для публичного API.

## Детали реализации фильтров

### `withoutDeps()`
```ts
export const withoutDeps = (): TaskPredicate =>
  (task) => !task.dependencies || task.dependencies.length === 0;
```

### `expired(referenceDate?)`
```ts
export const expired = (referenceDate: Date = new Date()): TaskPredicate =>
  (task) => {
    const end = new Date(task.endDate);
    const ref = referenceDate;
    return end.getTime() < ref.getTime();
  };
```

### `inDateRange(start, end)`
Задача пересекается с диапазоном (хотя бы один день):
```ts
export const inDateRange = (rangeStart: Date, rangeEnd: Date): TaskPredicate =>
  (task) => {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);
    return taskStart <= rangeEnd && taskEnd >= rangeStart;
  };
```

### `progressInRange(min, max)`
```ts
export const progressInRange = (min: number, max: number): TaskPredicate =>
  (task) => {
    const progress = task.progress ?? 0;
    return progress >= min && progress <= max;
  };
```

### `nameContains(substring, caseSensitive?)`
```ts
export const nameContains = (substring: string, caseSensitive = false): TaskPredicate =>
  (task) => {
    const name = task.name;
    const search = caseSensitive ? substring : substring.toLowerCase();
    const target = caseSensitive ? name : name.toLowerCase();
    return target.includes(search);
  };
```

### Булевы композиты
```ts
export const and = (...predicates: TaskPredicate[]): TaskPredicate =>
  (task) => predicates.every(p => p(task));

export const or = (...predicates: TaskPredicate[]): TaskPredicate =>
  (task) => predicates.some(p => p(task));

export const not = (predicate: TaskPredicate): TaskPredicate =>
  (task) => !predicate(task);
```

## Файлы для изменения

1. `packages/gantt-lib/src/filters/index.ts` — **новый файл**
2. `packages/gantt-lib/src/components/GanttChart/GanttChart.tsx` — добавить проп и обновить filteredTasks
3. `packages/gantt-lib/src/index.ts` — добавить экспорт фильтров

## Проверка

### Визуальная проверка
1. Создать демо с различными фильтрами
2. Проверить что при фильтрации задачи скрываются
3. Проверить что при drag задачи зависимости пересчитываются корректно (включая скрытые задачи)

### Тесты (опционально)
```ts
describe('filters', () => {
  test('withoutDeps filters tasks without dependencies', () => { ... });
  test('expired filters overdue tasks', () => { ... });
  test('and combines predicates', () => { ... });
});
```

### MCP тесты
Можно использовать MCP gantt-lib для проверки:
1. Создать задачи с разными характеристиками
2. Применить фильтр
3. Проверить что вернулись правильные задачи

## Примеры использования

```tsx
// Только задачи без связей
<GanttChart tasks={tasks} taskFilter={withoutDeps()} />

// Просроченные или без прогресса
<GanttChart
  tasks={tasks}
  taskFilter={or(expired(), progressInRange(0, 0))}
/>

// Задачи в марте с прогрессом > 50%
<GanttChart
  tasks={tasks}
  taskFilter={and(
    inDateRange(new Date('2026-03-01'), new Date('2026-03-31')),
    progressInRange(50, 100)
  )}
/>

// Кастомный фильтр
<GanttChart
  tasks={tasks}
  taskFilter={(task) => task.name.startsWith('API') && task.color === '#ff0000'}
/>
```

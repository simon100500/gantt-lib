# Handoff: масштабирование длительности поддерева родительской задачи

> **Актуальное интеграционное правило:** для приложений, которым нужно сохранять график
> через серверные команды, authoritative-контрактом является
> [`2026-08-24-schedule-intent-contract.md`](superpowers/specs/2026-08-24-schedule-intent-contract.md).
> Старая схема сохранения через эвристику по `onTasksChange` не различает resize
> родителя и rollup после изменения ребёнка и считается legacy.

> Этот документ описывает API масштабирования поддерева и legacy-интеграцию
> через `onTasksChange`. Для новой серверной интеграции persistence boundary —
> `onScheduleIntent`, описанный в контракте выше.

---

## 1. Что это за фича

Родительская задача — вычисляемая обёртка: её даты всегда выводятся из детей.
Поэтому «сжать/растянуть родителя» = **пропорционально перемасштабировать всё его
поддерево** до точной целевой длительности, меняя только длительности листьев
(и при необходимости — внутренние лаги). Операция чистая, детерминированная,
без React/DOM/date-fns, возвращает **один атомарный батч** изменённых задач.

Входной снимок (`Task[]`) **никогда не мутируется**.

---

## 2. Где лежит публичный контракт (экспорты)

| Символ | Откуда импортировать |
|--------|----------------------|
| `scaleTaskSubtreeDuration` (функция) | `gantt-lib/core/scheduling` |
| `ScaleTaskSubtreeResult` (тип) | `gantt-lib/core/scheduling` |
| `ScaleTaskSubtreeOptions` (тип) | `gantt-lib/core/scheduling` |
| `ScaleTaskSubtreeAnchor` (`'start' \| 'end'`) | `gantt-lib/core/scheduling` |
| `ScaleTaskSubtreeExternalPolicy` (`'subtree-only' \| 'cascade-successors'`) | `gantt-lib/core/scheduling` |
| `ScaleTaskSubtreeWarning` / `ScaleTaskSubtreeErrorCode` | `gantt-lib/core/scheduling` |
| проп `onSubtreeScaleResult` | `gantt-lib` (из `GanttChartProps`) |
| проп `taskDateChangeMode` + тип `TaskDateChangeMode` | `gantt-lib` (из `GanttChartProps`) |

⚠️ **Функция и тип результата НЕ реэкспортированы из главного барреля `gantt-lib`** —
только через субпас `gantt-lib/core/scheduling`. Пропсы же — из главного entry
(через `GanttChartProps`).

---

## 3. Сценарий A — Headless (свой UI / импорт извне / тесты)

Полный вызов `scaleTaskSubtreeDuration` и коммит батча в хранилище:

```ts
import {
  scaleTaskSubtreeDuration,
  type ScaleTaskSubtreeResult,
} from 'gantt-lib/core/scheduling';
import type { Task } from 'gantt-lib';

/**
 * Перемасштабировать поддерево родителя до targetDuration (в проектных днях)
 * и слить изменённые задачи в текущее состояние.
 */
function rescaleParent(
  parentId: string,
  targetDurationDays: number,
  snapshot: Task[],
  setTasks: (next: Task[]) => void,
): ScaleTaskSubtreeResult {
  const result = scaleTaskSubtreeDuration(
    parentId,
    targetDurationDays,
    snapshot,
    {
      anchor: 'start',                 // неподвижная граница: 'start' | 'end'
      businessDays: false,            // считать длительность в рабочих днях
      // weekendPredicate: isCustomWeekend,
      externalDependencyPolicy: 'cascade-successors',
    },
  );

  if (result.ok && result.changedTasks.length > 0) {
    // result.changedTasks — это НЕ полный снимок, а только изменённые задачи.
    // Сливаем их в текущее состояние ПО ID (порядок в батче канонический, но
    // для рендера важен ключ, а не позиция).
    const byId = new Map(snapshot.map((t) => [t.id, t]));
    for (const t of result.changedTasks) byId.set(t.id, t);
    setTasks([...byId.values()]);
  } else if (!result.ok) {
    // result.code: ScaleTaskSubtreeErrorCode (см. раздел 6)
    console.error('[subtree-scale] failed:', result.code, result.details);
  }

  return result;
}
```

Ключевые факты:

- **`targetDuration` — в проектных днях** (milestone всегда занимает 1 ячейку).
  В business-режиме считается в рабочих днях через `weekendPredicate`.
- **`result.changedTasks`** — список изменённых задач в каноническом порядке:
  1. изменённые листья (в порядке снимка),
  2. вложенные родители (от самого глубокого к выбранному),
  3. внешние каскадные successors (в топологическом порядке).
- **Clamp:** если цель недостижима (ниже минимума), применяется доказанный минимум,
  `ok: true`, `clamped: true` и `warnings: [{ code: 'TARGET_CLAMPED_TO_MINIMUM', ... }]`.
  Это **не** ошибка — батч всё равно валиден и его надо закоммитить.
- `snapshot` не мутируется — можно вызывать повторно с тем же массивом.

---

## 4. Legacy: как коммитить изменения дат (`onTasksChange`)

> Этот раздел оставлен только для legacy-интеграций без `onScheduleIntent`.
> Для серверного command adapter используйте
> `docs/superpowers/specs/2026-08-24-schedule-intent-contract.md` и сохраняйте
> исходное намерение пользователя, а не materialized `changedTasks`.

`onTasksChange` ждёт **полный следующий снимок** задач (как и любой другой хендлер
GanttChart). Батч из `scaleTaskSubtreeDuration` содержит только изменённые задачи,
поэтому его нельзя передавать как есть — иначе остальные задачи «исчезнут».

Универсальный merge по id (используйте везде, где прилетает частичный батч):

```ts
function applyBatch(snapshot: Task[], batch: Task[]): Task[] {
  const byId = new Map(snapshot.map((t) => [t.id, t]));
  for (const t of batch) byId.set(t.id, t);
  return [...byId.values()];
}

// в обработчике:
if (result.ok) {
  onTasksChange(applyBatch(currentTasks, result.changedTasks));
}
```

Если ваше хранилище само делает immutable-merge по id — просто прокиньте
`result.changedTasks` напрямую, главное, чтобы итоговое состояние содержало и
неизменённые задачи.

---

## 5. Legacy: сценарий B — встроенный UI (`<GanttChart>`)

> Для новой серверной интеграции этот пример описывает только локальное
> состояние старого API. `onTasksChange` не является persistence boundary при
> использовании `onScheduleIntent`.

В режиме gantt всё вышеописанное происходит автоматически при перетаскивании
**края родительского бара** (resize handle). Вам нужно только подписаться на
результат и выбрать поведение чекбокса «сохранять длительность».

```tsx
<GanttChart
  tasks={tasks}
  onTasksChange={setTasks}
  // Чекбокс «сохранять длительность»:
  //  'preserve-duration' — двигаем срок целиком, длительности детей не меняются
  //  'free'              — меняем длительность = пропорциональное масштабирование поддерева
  taskDateChangeMode="free"
  // Структурированный результат масштабирования для локализованных уведомлений:
  onSubtreeScaleResult={(result) => {
    if (result.ok && result.clamped) {
      notify.warning(
        `Достигнут минимум: ${result.appliedDuration} из запрошенных ` +
        `${result.requestedDuration} дн.`,
      );
    } else if (!result.ok) {
      notify.error(`Не удалось масштабировать: ${result.code}`);
    }
  }}
/>
```

Поведение жестов:

| Жест | Что происходит |
|------|----------------|
| Перетаскивание **края родительского бара** | Всегда **rescale** поддерева через `scaleTaskSubtreeDuration` (независимо от чекбокса) |
| Перетаскивание родителя целиком при `preserve-duration` | Равномерный сдвиг потомков на одинаковое число проектных дней (длительности не меняются) |
| Перетаскивание родителя при `free` / смена одной границы | Пропорциональное масштабирование поддерева |

Дельты при редактировании дат родителя в TaskList считаются в **проектных днях**
(в business-режиме — в рабочих), что чинит «скачки» через выходные.

> Внутри GanttChart для UI-resize используется
> `externalDependencyPolicy: 'cascade-successors'` (внешние successors сдвигаются
> с сохранением длительностей). Для headless по умолчанию — `'subtree-only'`.

---

## 6. Тип результата и коды ошибок

```ts
type ScaleTaskSubtreeResult =
  | {
      ok: true;
      changedTasks: Task[];
      changedIds: string[];
      requestedDuration: number;
      appliedDuration: number;
      clamped: boolean;
      warnings: ScaleTaskSubtreeWarning[]; // [{ code: 'TARGET_CLAMPED_TO_MINIMUM', requestedDuration, minimumDuration }]
    }
  | {
      ok: false;
      code: ScaleTaskSubtreeErrorCode;
      changedTasks: [];
      changedIds: [];
      details?: string[];
    };

type ScaleTaskSubtreeErrorCode =
  | 'INVALID_TARGET_DURATION'      // targetDuration не конечное целое число ≥ 0
  | 'TASK_NOT_FOUND'               // parentId нет в снимке
  | 'NOT_A_PARENT'                 // задача не имеет потомков
  | 'INVALID_HIERARCHY'            // цикл / некорректное дерево
  | 'INVALID_DEPENDENCIES'         // нарушены связи после пересчёта
  | 'INVALID_DATES'                // невалидные даты во входе
  | 'INVALID_MINIMUM'              // getMinDuration/getMinLag дают некорректный минимум
  | 'EXTERNAL_DEPENDENCY_CONFLICT' // внешняя зависимость нарушена (см. policy ниже)
```

---

## 7. Политика внешних зависимостей (`externalDependencyPolicy`)

- **`'subtree-only'` (по умолчанию для headless):** внешние задачи (вне поддерева)
  остаются зафиксированными. Если масштабирование нарушает исходящую связь —
  возвращается `EXTERNAL_DEPENDENCY_CONFLICT`, `ok: false`, **изменений нет**.
- **`'cascade-successors'`:** внешние successors сдвигаются с сохранением своих
  длительностей; недопустимый (immutable) внешний successor отменяет операцию с
  `EXTERNAL_DEPENDENCY_CONFLICT`. Изменённые внешние задачи попадают в
  `changedTasks` — не забудьте закоммитить и их.

---

## 8. Типичные ошибки интеграции

1. **Мутация `snapshot`** перед/после вызова — не делайте, функция не мутирует,
   но и вам трогать входной массив не нужно.
2. **Передача `result.changedTasks` напрямую в `onTasksChange`** без merge по id —
   теряются неизменённые задачи. Всегда сливайте в полный снимок (раздел 4).
3. **Путаница проектные дни vs календарные** — `targetDuration` и дельты всегда в
   проектных днях; в business-режиме передавайте `businessDays: true` +
   `weekendPredicate`.
4. **Импорт `scaleTaskSubtreeDuration` из `gantt-lib`** — такого экспорта нет,
   только из `gantt-lib/core/scheduling`.
5. **Игнорирование `clamped`** — при clamp `ok: true`, батч валиден и его надо
   закоммитить; просто покажите пользователю warning.

---

## 9. Ссылки

- PRD: `docs/superpowers/specs/2026-08-23-parent-subtree-duration-scaling-prd.md`
- `docs/reference/14-headless-scheduling.md` — `scaleTaskSubtreeDuration`, опции, результат (помечено **stable** public API)
- `docs/reference/10-drag-interactions.md` — раздел «Parent Bar Resize = Subtree Scaling», проп `onSubtreeScaleResult`, поведение `taskDateChangeMode`
- Исходник контракта: `packages/gantt-lib/src/core/scheduling/subtreeScaling.ts` (маркер `// START_MODULE_CONTRACT`)

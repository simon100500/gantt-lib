# Business Days Mode (Режим рабочих дней)

Режим рабочих дней (`businessDays`) управляет тем, как считается длительность задач — в календарных или рабочих днях.

## Prop: `businessDays`

```typescript
businessDays?: boolean;  // default: true
```

| Значение | Поведение |
|----------|-----------|
| `true` (default) | Длительность считается в **рабочих днях** (исключая выходные). Задача на 5 дней, начинающаяся в пятницу, закончится в следующую пятницу. |
| `false` | Длительность считается в **календарных днях**. Задача на 5 дней всегда заканчивается через 5 календарных дней. |

---

## Влияние на расчёты

Когда `businessDays={true}`:

1. **Duration calculations** — При изменении даты начала или конца, длительность пересчитывается в рабочих днях
2. **Dependency lag** — Задержка зависимостей считается в рабочих днях
3. **Task dragging** — При перетаскивании задачи она "прилипает" к будням
4. **Cascade operations** — Каскадное обновление дат учитывает выходные

---

## Утилиты для работы с рабочими днями

```typescript
import { getBusinessDaysCount, addBusinessDays } from 'gantt-lib';
```

### `getBusinessDaysCount(startDate, endDate, isWeekend?)`

Подсчитывает количество рабочих дней между двумя датами.

```typescript
const count = getBusinessDaysCount(
  new Date(Date.UTC(2026, 2, 1)),  // 1 марта 2026 (пн)
  new Date(Date.UTC(2026, 2, 7)),  // 7 марта 2026 (вс)
  (date) => date.getUTCDay() === 0 || date.getUTCDay() === 6  // выходные: сб, вс
);
// count = 5 (пн, вт, ср, чт, пт)
```

### `addBusinessDays(date, days, isWeekend?)`

Добавляет указанное количество рабочих дней к дате.

```typescript
const result = addBusinessDays(
  new Date(Date.UTC(2026, 2, 6)),  // 6 марта 2026 (пт)
  3,  // добавить 3 рабочих дня
  (date) => date.getUTCDay() === 0 || date.getUTCDay() === 6
);
// result = 11 марта 2026 (ср) — пт + 3 рабочих дня = пт, пн, вт, ср
```

---

## Пример использования

```tsx
import { GanttChart } from 'gantt-lib';
import 'gantt-lib/styles.css';

function ProjectSchedule() {
  return (
    <GanttChart
      tasks={tasks}
      businessDays={true}  // считать в рабочих днях (default)
      isWeekend={(date) => {
        const day = date.getUTCDay();
        return day === 0 || day === 6;  // сб, вс = выходные
      }}
      onTasksChange={handleChange}
    />
  );
}
```

---

## Сценарии использования

**Сценарий 1: Стандартная 5-дневная рабочая неделя**

```tsx
<GanttChart
  businessDays={true}  // default
  // выходные определяются автоматически (сб, вс)
/>
```

**Сценарий 2: 6-дневная рабочая неделя**

```tsx
<GanttChart
  businessDays={true}
  isWeekend={(date) => date.getUTCDay() === 0}  // только вс = выходной
/>
```

**Сценарий 3: Календарные дни (без выходных)**

```tsx
<GanttChart
  businessDays={false}  // считать в календарных днях
/>
```

---

## Взаимодействие с `customDays` и `isWeekend`

Порядок приоритета при определении выходного дня:

1. **`customDays`** — явное указание типа для конкретной даты
2. **`isWeekend`** — базовый предикат выходных (если не переопределён в `customDays`)
3. **Default** — сб (6) и вс (0) считаются выходными

Когда `businessDays={true}`:
- Выходные дни (определённые через `isWeekend` или `customDays` с `type: 'weekend'`) **исключаются** из расчёта длительности
- Рабочие дни (определённые через `customDays` с `type: 'workday'`) **включаются** в расчёт

---

## Особенности реализации

- **UTC dates**: Все утилиты работают с UTC датами для избежания проблем с часовыми поясами
- **Inclusive start**: При подсчёте рабочих дней начальная дата включается
- **Weekend snapping**: При перетаскивании в режиме рабочих дней задачи "прилипают" к ближайшему будню
- **Lag calculations**: Задержка зависимостей автоматически пересчитывается при изменении дат

---

[← Back to API Reference](./INDEX.md)

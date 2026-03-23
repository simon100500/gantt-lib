# Custom Weekends API

The library supports custom weekend/workday calendars via the `customDays` prop and optional `isWeekend` predicate. This is useful for:
- National holidays (e.g., March 8, May 1-9 in Russia)
- Company-specific off days
- Shifted workdays (working Saturdays)
- Alternative work week patterns (4-day work week, Sunday-only weekends)

**IMPORTANT — Date Format:**

All custom day dates MUST be created as UTC dates to avoid timezone issues:

```tsx
// ❌ WRONG — uses local timezone, may cause off-by-one errors
const holiday = new Date('2026-03-08');

// ✅ CORRECT — explicit UTC date
const holiday = { date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' };
```

**Why UTC?** The library internally uses UTC for all date calculations. If you pass a local timezone date, the date may be interpreted as the previous or next day depending on the user's timezone.

---

## CustomDayConfig Type

Each custom day is defined with an explicit type:

```typescript
interface CustomDayConfig {
  date: Date;           // The date to customize (UTC)
  type: 'weekend' | 'workday';  // Explicit type annotation
}
```

---

## Adding Holidays

Use `customDays` with `type: 'weekend'` to ADD specific dates to the default Saturday/Sunday weekends:

```tsx
import { GanttChart } from 'gantt-lib';

const holidays = [
  { date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' },   // March 8
  { date: new Date(Date.UTC(2026, 4, 1)), type: 'weekend' },   // May 1
  { date: new Date(Date.UTC(2026, 4, 9)), type: 'weekend' },   // May 9
];

<GanttChart
  tasks={tasks}
  customDays={holidays}
/>
```

**Behavior:**
- Default weekends (Saturday, Sunday) remain
- Holidays are added to the default weekends
- Grid background highlights these dates
- Task dates respect these as non-working days

---

## Working Saturdays

Use `customDays` with `type: 'workday'` to EXCLUDE specific dates from default weekends:

```tsx
const workingSaturdays = [
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' },  // Saturday, March 14
  { date: new Date(Date.UTC(2026, 2, 21)), type: 'workday' },  // Saturday, March 21
];

<GanttChart
  tasks={tasks}
  customDays={workingSaturdays}
/>
```

**Behavior:**
- Specified dates become workdays even if they fall on Saturday/Sunday
- Grid background does NOT highlight these dates

---

## Combining Weekends and Workdays

You can mix both types in a single array:

```tsx
const customDays = [
  // Add holidays
  { date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' },   // March 8 — holiday
  { date: new Date(Date.UTC(2026, 4, 1)), type: 'weekend' },   // May 1 — holiday
  // Add working Saturdays
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' },  // March 14 — workday
  { date: new Date(Date.UTC(2026, 2, 21)), type: 'workday' },  // March 21 — workday
];

<GanttChart
  tasks={tasks}
  customDays={customDays}
/>
```

---

## Custom Weekend Predicate (isWeekend prop)

For maximum flexibility, provide a base `isWeekend` predicate:

```tsx
// Sunday-only weekends (6-day work week)
const sundayOnlyWeekend = (date: Date) => {
  return date.getUTCDay() === 0; // Only Sunday (0)
};

<GanttChart
  tasks={tasks}
  isWeekend={sundayOnlyWeekend}
/>
```

```tsx
// 4-day work week (Friday, Saturday, Sunday are weekends)
const fourDayWorkWeek = (date: Date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 5 || day === 6; // Sun, Fri, Sat
};

<GanttChart
  tasks={tasks}
  isWeekend={fourDayWorkWeek}
/>
```

**Important:** `isWeekend` is the **base predicate**. Specific dates from `customDays` override it:

```tsx
// 4-day work week, but make some Fridays workdays
const customDays = [
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' },  // Working Friday
];

<GanttChart
  tasks={tasks}
  isWeekend={fourDayWorkWeek}  // Fri-Sun are weekends
  customDays={customDays}       // But March 14 is a workday
/>
```

---

## Precedence Order

When both `customDays` and `isWeekend` are provided, the following precedence applies (highest to lowest):

1. **`customDays` with `type: 'workday'`** — overrides everything
2. **`customDays` with `type: 'weekend'`** — overrides base predicate and default
3. **`isWeekend`** predicate — base pattern (if provided)
4. **Default** — Saturday (6) and Sunday (0) only

```tsx
// Example: Same date with different types
const customDays = [
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' },
];
// Result: March 14 is a WORKDAY (workday takes precedence)
```

---

## Internal Implementation

The library uses `createCustomDayPredicate()` utility from `src/utils/dateUtils.ts`:

```typescript
export interface CustomDayConfig {
  date: Date;
  type: 'weekend' | 'workday';
}

export interface CustomDayPredicateConfig {
  customDays?: CustomDayConfig[];
  isWeekend?: (date: Date) => boolean;
}

export const createCustomDayPredicate = (
  config: CustomDayPredicateConfig
): ((date: Date) => boolean) => {
  const { customDays, isWeekend: basePredicate } = config;

  // Build Set-based lookups for O(1) performance
  const workdaySet = new Set<string>();
  const weekendSet = new Set<string>();

  customDays?.forEach(({ date, type }) => {
    const key = createDateKey(date);
    if (type === 'workday') {
      workdaySet.add(key);
    } else {
      weekendSet.add(key);
    }
  });

  return (date: Date) => {
    const key = createDateKey(date);

    // Priority 1: Workday (highest)
    if (workdaySet.has(key)) {
      return false;
    }

    // Priority 2: Weekend
    if (weekendSet.has(key)) {
      return true;
    }

    // Priority 3: Base predicate
    if (basePredicate) {
      return basePredicate(date);
    }

    // Priority 4: Default
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  };
};
```

**Key Utility Functions:**

```typescript
// Creates UTC-safe date key for Set lookup: "2026-2-15"
// Note: Month is 0-indexed (0=January)
export const createDateKey = (date: Date): string => {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
};
```

---

## Usage Examples

**Example 1: Russian Holidays 2026**

```tsx
import { GanttChart } from 'gantt-lib';

const russianHolidays2026 = [
  // New Year holidays
  { date: new Date(Date.UTC(2026, 0, 1)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 2)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 3)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 4)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 5)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 6)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 7)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 0, 8)), type: 'weekend' },
  // Defender of the Fatherland Day
  { date: new Date(Date.UTC(2026, 1, 23)), type: 'weekend' },
  // International Women's Day
  { date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' },
  // Spring and Labour Day
  { date: new Date(Date.UTC(2026, 4, 1)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 2)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 3)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 4)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 5)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 6)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 7)), type: 'weekend' },
  { date: new Date(Date.UTC(2026, 4, 8)), type: 'weekend' },
  // Victory Day
  { date: new Date(Date.UTC(2026, 4, 9)), type: 'weekend' },
  // Russia Day
  { date: new Date(Date.UTC(2026, 5, 12)), type: 'weekend' },
  // Unity Day
  { date: new Date(Date.UTC(2026, 10, 4)), type: 'weekend' },
];

<GanttChart
  tasks={tasks}
  customDays={russianHolidays2026}
/>
```

**Example 2: Holidays + Working Saturdays**

```tsx
const customDays = [
  // Holidays
  { date: new Date(Date.UTC(2026, 2, 8)), type: 'weekend' },   // March 8
  { date: new Date(Date.UTC(2026, 4, 1)), type: 'weekend' },   // May 1
  // Working Saturdays (shifted workdays)
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' },  // March 14
  { date: new Date(Date.UTC(2026, 2, 21)), type: 'workday' },  // March 21
];

<GanttChart
  tasks={tasks}
  customDays={customDays}
/>
```

**Example 3: 4-Day Work Week with Overrides**

```tsx
// Base: Fri-Sun are weekends
const fourDayWorkWeek = (date: Date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 5 || day === 6; // Sun, Fri, Sat
};

// But make some Fridays workdays
const customDays = [
  { date: new Date(Date.UTC(2026, 2, 14)), type: 'workday' },  // Working Friday
  { date: new Date(Date.UTC(2026, 2, 28)), type: 'workday' },  // Working Friday
];

<GanttChart
  tasks={tasks}
  isWeekend={fourDayWorkWeek}
  customDays={customDays}
/>
```

**Example 4: Dynamic Holiday Calculation**

```tsx
import { useMemo } from 'react';

const App = () => {
  const customDays = useMemo(() => {
    const year = new Date().getUTCFullYear();
    return [
      { date: new Date(Date.UTC(year, 0, 1)), type: 'weekend' },
      { date: new Date(Date.UTC(year + 1, 0, 1)), type: 'weekend' },
    ];
  }, []);

  return <GanttChart tasks={tasks} customDays={customDays} />;
};
```

**Example 5: Calendar Component Integration**

The `Calendar` component also supports custom weekends:

```tsx
import { Calendar } from 'gantt-lib';

const isWeekend = (date: Date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Default Sat/Sun
};

<Calendar
  selected={selectedDate}
  onSelect={setSelectedDate}
  isWeekend={isWeekend}
/>
```

---

[← Back to API Reference](./INDEX.md)

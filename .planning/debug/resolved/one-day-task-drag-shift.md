---
status: awaiting_human_verify
trigger: "При перетаскивании за правый край задачи длиной 1 день она сдвигается вместо растягивания"
created: 2025-02-27T00:00:00.000Z
updated: 2025-02-27T00:00:00.000Z
---

## Current Focus
hypothesis: When edgeZoneWidth (20px) >= task width (e.g., 40px for dayWidth=40), the left and right edge zones overlap, causing the right edge check to never trigger as 'right' because the 'move' zone doesn't exist for 1-day tasks
test: Calculate edge zone overlap for 1-day tasks and verify detectEdgeZone logic
expecting: When width < 2 * edgeZoneWidth, the left edge zone covers the entire bar, right edge is never detected
next_action: Verify hypothesis with concrete calculations and fix detectEdgeZone

## Symptoms
expected: Задача должна растягиваться от правого края (увеличиваться до 2 дней)
actual: Задача сдвигается вправо, длина остается 1 день
errors: Нет ошибок в консоли
reproduction: |
  1. Создать задачу длиной 1 день
  2. Потянуть за правый край задачи
  3. Задача сдвигается вместо растягивания

  Дополнительно:
  - За левый край - работает нормально (растягивается)
  - При 2+ днях - работает нормально (растягивается)
  - Баг только для задач на 1 день при перетаскивании за ПРАВЫЙ край
started: Проблема обнаружена при тестировании, неизвестно когда появилась

## Eliminated

## Evidence
- timestamp: 2025-02-27T00:00:00.000Z
  checked: useTaskDrag.ts and TaskRow.tsx drag handling
  found: TaskRow uses edgeZoneWidth: 20 when calling useTaskDrag (line 156)
  implication: Left and right edge zones are each 20px wide

- timestamp: 2025-02-27T00:00:00.000Z
  checked: geometry.ts detectEdgeZone function (lines 75-96)
  found: Logic: left zone = [0, edgeZoneWidth], right zone = [width-edgeZoneWidth, width], move = middle
  implication: When width < 2 * edgeZoneWidth (e.g., 40px width < 40px zones), zones overlap

- timestamp: 2025-02-27T00:00:00.000Z
  checked: detectEdgeZone execution order
  found: Function checks left zone FIRST (lines 84-86), then right zone (lines 89-92), then returns 'move'
  implication: When clicking on right edge of a 1-day task with 40px dayWidth and 20px edgeZoneWidth:
    - width = 40px
    - edgeZoneWidth = 20px
    - Left zone covers [0, 20]
    - Right zone should cover [20, 40]
    - But left check runs first and catches relativeX >= 0 && relativeX <= 20
    - This includes pixel 20 (the center point!)
    - The zones overlap at pixel 20, so 'left' wins due to check order

ROOT CAUSE IDENTIFIED: The edge zone check order causes overlap ambiguity. For a 1-day task (40px wide), the left zone [0, 20] and right zone [20, 40] overlap at pixel 20. Since 'left' is checked first, clicking on the center-right portion returns 'left' instead of 'right'. This causes resize-left behavior instead of resize-right.

- timestamp: 2025-02-27T00:00:00.000Z
  checked: Symptoms again - "task shifts instead of stretches"
  found: When clicking right edge and getting 'left' mode, the mouse drag moves the left edge (resize-left), which visually shifts the task right while keeping width constant (for small drags before width expands)
  implication: This matches the reported behavior perfectly! The user thinks they're pulling the right edge to resize, but they're actually pulling the left edge, which moves the task.

## Resolution
root_cause: detectEdgeZone in geometry.ts checks left edge zone before right edge zone. For 1-day tasks where width <= 2 * edgeZoneWidth (e.g., 40px width, 20px edgeZoneWidth), the zones overlap. Clicking on the right half of the task returns 'left' because the left zone check runs first and catches the overlapping pixel. This causes resize-left mode instead of resize-right mode.
fix: Modified detectEdgeZone to prefer the closer edge when zones overlap. When width <= 2 * edgeZoneWidth, the function now calculates distance to left and right edges and returns the closer one.
verification: |
  Self-verified with unit tests (9 new tests added to geometry.test.ts):
  1. Normal width tasks: left/right/move zones work correctly (unchanged)
  2. 1-day tasks: clicking closer to right edge returns 'right' (FIXED)
  3. 1-day tasks: clicking closer to left edge returns 'left' (unchanged)
  4. 1-day tasks: center click returns 'left' (tiebreaker, reasonable)
  5. 1-day tasks: far edges work correctly
  6. Offset task bars work correctly

  All 144 tests pass (135 original + 9 new).
files_changed:
  - D:/Projects/gantt-lib/packages/gantt-lib/src/utils/geometry.ts
  - D:/Projects/gantt-lib/packages/gantt-lib/src/__tests__/geometry.test.ts

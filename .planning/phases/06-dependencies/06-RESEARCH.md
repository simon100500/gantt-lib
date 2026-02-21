# Phase 6: Dependencies - Research

**Researched:** 2026-02-21
**Domain:** React Gantt chart dependencies with SVG visualization and constraint validation
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Типы связей**
- Поддерживаются все 4 типа связей: FS (finish-to-start), SS (start-to-start), FF (finish-to-finish), SF (start-to-finish)
- Лаг (задержка) указывается в целых днях, поддерживаются положительные и отрицательные значения
- У задачи может быть несколько предшественников

**Визуализация**
- Зависимости рисуются кривыми Безье со стрелками от конца предшественника к началу последовательника
- Нейтральный цвет (серый/чёрный) для всех линий зависимостей
- При наведении/перетаскивании задачи зависимости НЕ подсвечиваются

**Поведение расписания**
- Автоматическое сдвигание зависимых задач происходит только когда включён специальный режим (автопланирование)
- При перемещении задачи блокируется только перемещение, если это нарушит зависимость. Изменение размера не блокируется.
- При удалении зависимости связь удаляется полностью

**API и валидация**
- Зависимости задаются внутри объекта задачи: `{ id, name, startDate, endDate, dependencies: [{ taskId, type, lag }] }`
- Тип связи указывается двухбуквенным кодом: 'FS', 'SS', 'FF', 'SF'
- При обнаружении циклической зависимости — визуально подсветить красным (не блокировать рендер)
- Предоставить API для программной проверки зависимостей (массив ошибок/предупреждений)

### Claude's Discretion

- Точный формат API для автопланирования (переключатель)
- Способ визуального подсвечивания циклических зависимостей
- Детали кривых Безье (степень, контрольные точки)
- Размер стрелки на конце линии

### Deferred Ideas (OUT OF SCOPE)

Нет — обсуждение осталось в рамках фазы
</user_constraints>

## Summary

Phase 6 requires implementing task dependencies (predecessor/successor relationships) with four link types (FS, SS, FF, SF), lag support, cycle detection, and SVG-based Bezier curve visualization with arrows. The implementation must integrate with the existing drag-and-drop system while maintaining 60fps performance.

**Key technical challenges:**
1. **SVG overlay positioning:** Dependency lines must be drawn between task bars across potentially distant rows
2. **Cycle detection:** Need to detect circular dependencies in a directed graph (standard DFS algorithm)
3. **Constraint validation:** During drag operations, check if move violates dependencies
4. **Bezier curve calculations:** Calculate control points for smooth curved lines between arbitrary positions
5. **Arrow rendering:** SVG markers for line endpoints

**Primary recommendation:** Use SVG overlay layer with cubic Bezier curves, standard DFS for cycle detection, and extend existing task drag validation. No additional dependencies needed - native SVG and graph algorithms are sufficient.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | ^4.1.0 | Date arithmetic (already in use) | Consistent with existing UTC date patterns |
| React | ^19.0.0 | Component rendering (already in use) | Existing codebase standard |
| TypeScript | ^5.7.0 | Type safety (already in use) | Existing codebase standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native SVG | Browser API | Rendering dependency lines and arrows | All dependency visualization - no library needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native SVG | React D3 Library | D3 adds complexity for simple Bezier curves. Native SVG with React is sufficient for this use case. |
| Native SVG | Canvas API | Canvas is less accessible for screen readers, harder to debug. SVG is declarative and easier to inspect. |
| Custom DFS | graphlib | Adds dependency for simple cycle detection. Custom DFS is straightforward and sufficient. |

**Installation:** No new dependencies required - build on existing stack.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── types/
│   └── index.ts                 # Add: Dependency, LinkType, ValidationResult types
├── utils/
│   ├── dateUtils.ts             # Extend: Date calculations with lag
│   ├── geometry.ts              # Extend: Bezier curve calculations
│   └── dependencyUtils.ts       # New: Cycle detection, validation
├── components/
│   ├── GanttChart/
│   │   └── GanttChart.tsx       # Extend: Add SVG layer, validation props
│   ├── DependencyLines/         # New: SVG overlay component
│   │   ├── DependencyLines.tsx
│   │   └── DependencyLines.css
│   └── TaskRow/
│       └── TaskRow.tsx          # Extend: Pass validation state to drag
└── hooks/
    └── useTaskDrag.ts           # Extend: Add constraint checking
```

### Pattern 1: Dependency Type Definitions

Extend Task interface with dependencies array:

```typescript
// Source: Based on existing Task interface in types/index.ts
export type LinkType = 'FS' | 'SS' | 'FF' | 'SF';

export interface TaskDependency {
  /** ID of the predecessor task */
  taskId: string;
  /** Type of link: FS (finish-to-start), SS, FF, SF */
  type: LinkType;
  /** Lag in days (positive or negative integer) */
  lag: number;
}

export interface Task {
  // ... existing properties
  /** Array of predecessor dependencies */
  dependencies?: TaskDependency[];
}
```

### Pattern 2: SVG Bezier Curve Rendering

Use cubic Bezier curves with vertical control points for smooth connections:

```typescript
// Source: Standard SVG path syntax
interface BezierCurve {
  x1: number;    // Start X (from right edge of predecessor)
  y1: number;    // Start Y (center of predecessor row)
  x2: number;    // End X (to left edge of successor)
  y2: number;    // End Y (center of successor row)
  cp1x: number;  // Control point 1 X
  cp1y: number;  // Control point 1 Y
  cp2x: number;  // Control point 2 X
  cp2y: number;  // Control point 2 Y
}

function calculateBezierPath(from: {x: number, y: number}, to: {x: number, y: number}): string {
  // Control points create vertical curve
  const cpOffset = Math.abs(to.y - from.y) * 0.5;
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + cpOffset}, ${to.x} ${to.y - cpOffset}, ${to.x} ${to.y}`;
}
```

### Pattern 3: Cycle Detection with DFS

Standard depth-first search for detecting circular dependencies:

```typescript
// Source: Standard graph traversal algorithm
interface CycleResult {
  hasCycle: boolean;
  cyclePath?: string[];  // Task IDs forming the cycle
}

function detectCycles(tasks: Task[]): CycleResult {
  const graph = buildAdjacencyList(tasks);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(taskId: string): boolean {
    if (visiting.has(taskId)) {
      // Found cycle - current task is already in recursion stack
      return true;
    }
    if (visited.has(taskId)) {
      return false;
    }

    visiting.add(taskId);
    path.push(taskId);

    const successors = graph.get(taskId) || [];
    for (const successor of successors) {
      if (dfs(successor)) {
        return true;
      }
    }

    visiting.delete(taskId);
    path.pop();
    visited.add(taskId);
    return false;
  }

  for (const task of tasks) {
    if (dfs(task.id)) {
      return { hasCycle: true, cyclePath: [...path] };
    }
  }

  return { hasCycle: false };
}
```

### Pattern 4: Link Type Date Calculations

Calculate successor date based on predecessor and link type:

```typescript
// Source: Standard PM link type calculations
function calculateSuccessorDate(
  predecessorStart: Date,
  predecessorEnd: Date,
  linkType: LinkType,
  lag: number
): Date {
  const baseDate = linkType.startsWith('F') ? predecessorEnd : predecessorStart;
  const targetIsStart = linkType.endsWith('S');

  // Apply lag (in days, converted to milliseconds)
  const lagMs = lag * 24 * 60 * 60 * 1000;
  const resultDate = new Date(baseDate.getTime() + lagMs);

  return resultDate;
}
```

### Anti-Patterns to Avoid

- **Rendering lines per TaskRow:** Lines span multiple rows - render in single SVG overlay at GanttChart level
- **Blocking resize on dependencies:** Context says only move is blocked, resize is allowed
- **Complex arrow libraries:** Native SVG `<marker>` is sufficient and simpler
- **Re-calculating curves on every frame:** Use React.memo with dependency on task positions only

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cycle detection | Custom BFS/DFS algorithm | Standard DFS (implement yourself) | Simple enough to implement directly; adding library dependency is overkill |
| Bezier curves | Canvas draw calls | SVG `<path>` with `d` attribute | Declarative, accessible, easier to debug |
| Arrow rendering | Custom polygon drawing | SVG `<marker>` element | Native browser support, scales automatically |
| Graph validation | Complex constraint solver | Simple link type date math | Four link types have straightforward calculations |

**Key insight:** Dependencies are simple directed graph edges with standard PM link types. The math is well-defined and doesn't need a scheduling engine library.

## Common Pitfalls

### Pitfall 1: Performance degradation with many dependencies

**What goes wrong:** Re-rendering all dependency lines on every task move causes frame drops.

**Why it happens:** SVG path strings are recalculated for every dependency even when unaffected.

**How to avoid:**
- Use React.memo on DependencyLines component
- Only re-render lines connected to the dragged task
- Use CSS `pointer-events: none` on SVG layer to avoid event overhead

**Warning signs:** FPS drops below 60 when dragging tasks with 20+ dependencies.

### Pitfall 2: Cycle detection on every render

**What goes wrong:** Running DFS cycle detection on every frame kills performance.

**Why it happens:** Placing cycle detection in render path instead of on dependency change.

**How to avoid:**
- Only run cycle detection when dependencies array changes
- Memoize cycle detection result
- Use `useMemo` with dependencies as key

**Warning signs:** Drag operations become sluggish, lag increases with task count.

### Pitfall 3: Incorrect control points for steep curves

**What goes wrong:** Bezier curves look jagged or loop back when connecting distant rows.

**Why it happens:** Fixed control point offset doesn't scale with vertical distance.

**How to avoid:**
- Make control point offset proportional to vertical distance
- Use `Math.abs(to.y - from.y) * 0.5` for smooth curves
- Consider minimum offset for same-row connections

**Warning signs:** Lines have sharp angles or visible kinks.

### Pitfall 4: SVG layer z-index issues

**What goes wrong:** Dependency lines appear on top of task bars or vice versa.

**Why it happens:** Incorrect z-index stacking of SVG overlay relative to task rows.

**How to avoid:**
- Place SVG layer with `z-index: 1` (below task bars which are `z-index: auto`)
- Or use `z-index: 10` to place above, with `pointer-events: none`

**Warning signs:** Lines block task bar clicks or are hidden behind bars.

### Pitfall 5: Not handling negative lag correctly

**What goes wrong:** Negative lag causes dates to go before predecessor, violating link logic.

**Why it happens:** Lag is added without considering link type semantics.

**How to avoid:**
- Validate that successor date respects link type constraint
- For FS links, successor start should always be >= predecessor end + lag
- Warn or highlight when constraint is violated (not blocked per requirements)

**Warning signs:** Tasks visually overlap in impossible ways.

## Code Examples

Verified patterns from official sources:

### SVG Marker Definition

```typescript
// Source: MDN SVG marker documentation
const DependencyLines: React.FC<DependencyLinesProps> = ({ dependencies }) => {
  return (
    <svg className="gantt-dependencies-svg">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
        </marker>
      </defs>
      {/* Paths go here */}
    </svg>
  );
};
```

### Path Element with Bezier Curve

```typescript
// Source: SVG path specification
const DependencyPath: React.FC<DependencyPathProps> = ({ from, to, hasCycle }) => (
  <path
    d={calculateBezierPath(from, to)}
    stroke={hasCycle ? '#ef4444' : '#666'}
    strokeWidth="2"
    fill="none"
    markerEnd="url(#arrowhead)"
    className={hasCycle ? 'gantt-dependency-cycle' : ''}
  />
);
```

### Task Position Calculation for Lines

```typescript
// Source: Based on existing geometry.ts patterns
interface TaskPosition {
  id: string;
  left: number;    // Task bar left edge
  right: number;   // Task bar right edge
  centerY: number; // Row center Y coordinate
}

function getTaskPositions(
  tasks: Task[],
  monthStart: Date,
  dayWidth: number,
  rowHeight: number
): Map<string, TaskPosition> {
  const positions = new Map();

  tasks.forEach((task, index) => {
    const startDate = parseUTCDate(task.startDate);
    const endDate = parseUTCDate(task.endDate);
    const { left, width } = calculateTaskBar(startDate, endDate, monthStart, dayWidth);

    positions.set(task.id, {
      id: task.id,
      left,
      right: left + width,
      centerY: index * rowHeight + rowHeight / 2,
    });
  });

  return positions;
}
```

### Dependency Validation API

```typescript
// Source: Based on requirements specification
export interface DependencyError {
  type: 'cycle' | 'constraint';
  taskId: string;
  message: string;
  relatedTaskIds?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: DependencyError[];
}

export function validateDependencies(
  tasks: Task[]
): ValidationResult {
  const errors: DependencyError[] = [];

  // Check for cycles
  const cycleResult = detectCycles(tasks);
  if (cycleResult.hasCycle && cycleResult.cyclePath) {
    errors.push({
      type: 'cycle',
      taskId: cycleResult.cyclePath[0],
      message: 'Circular dependency detected',
      relatedTaskIds: cycleResult.cyclePath,
    });
  }

  // Check constraint violations (optional, based on auto-schedule mode)
  // ...

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canvas for lines | SVG with markers | 2010s | Better accessibility, easier styling |
| Fixed control points | Proportional control points | Ongoing | Smoother curves for varying distances |
| Blocking on violations | Visual warning only | Per requirements | User can move anywhere, warned about constraints |

**Deprecated/outdated:**
- **Arrow images:** Use SVG `<marker>` instead of image files for arrows - scales better and renders faster
- **jQuery plugins:** Modern React uses declarative SVG, not imperative DOM manipulation

## Open Questions

1. **SVG layer positioning relative to scroll container**
   - What we know: Need to overlay on task area, handle horizontal scroll
   - What's unclear: Should SVG be inside or outside the scroll container?
   - Recommendation: Place SVG inside scroll container with absolute positioning, same width as grid, to scroll with content

2. **Arrow size and style**
   - What we know: Requirements specify arrow at line end
   - What's unclear: Exact size in pixels
   - Recommendation: Use 10x7px marker (standard size), make it a CSS variable for customization

3. **Curve style for same-row dependencies**
   - What we know: Bezier curves between rows use vertical control points
   - What's unclear: How to draw lines when predecessor and successor are in same row
   - Recommendation: Use small arc above or below task bar, with minimum 20px vertical offset

4. **Auto-schedule API format**
   - What we know: Should be optional mode
   - What's unclear: Exact prop name and format
   - Recommendation: `enableAutoSchedule?: boolean` prop on GanttChart, when true automatically shifts dependent tasks

## Sources

### Primary (HIGH confidence)

### Secondary (MEDIUM confidence)

### Tertiary (LOW confidence)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Building on existing codebase, no new dependencies needed
- Architecture: MEDIUM - SVG pattern is standard, but exact integration needs validation during implementation
- Pitfalls: MEDIUM - Based on common React/SVG performance issues and graph algorithm best practices

**Research date:** 2026-02-21
**Valid until:** 2026-03-23 (30 days - stable domain)

---

*Phase: 06-dependencies*
*Research complete*

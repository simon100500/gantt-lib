# Feature Research

**Domain:** React Gantt Chart Libraries (Lightweight)
**Researched:** 2026-02-18
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Timeline visualization** | Core purpose of Gantt - show tasks over time | LOW | Month view is requirement, but users expect date awareness |
| **Task bars rendering** | Visual representation of task duration | LOW | Must show start date, end date, and current position in time |
| **Task list/table view** | Users expect to see task names alongside the chart | MEDIUM | Left sidebar with task names, basic info |
| **Date header/axis** | Temporal context is essential | LOW | Shows months/weeks across the top |
| **Task CRUD operations** | Users expect to create, read, update tasks | MEDIUM | At minimum: create task, update dates, delete task |
| **Drag-to-resize tasks** | Standard interaction pattern for Gantt | MEDIUM | Drag edges to change start/end dates |
| **Drag-to-move tasks** | Standard interaction pattern for Gantt | MEDIUM | Drag bar to shift entire task in time |
| **Today indicator** | Users expect to see current date | LOW | Vertical line highlighting today |
| **Task IDs/identifiers** | Required for tracking and updates | LOW | Internal requirement for React keys and updates |
| **Basic styling/theming** | Users expect integration with their app's look | LOW | CSS variables or className support |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **True zero dependencies** | Bundle size optimization, no dependency hell | HIGH | Most Gantt libs depend on d3, moment, etc. |
| **Tree-shakeable API** | Users only bundle what they use | MEDIUM | Modern standard, but rare in Gantt libs |
| **Performance at 1000+ tasks** | Most libs choke at scale | HIGH | Virtualization, render optimization |
| **Simple API surface** | Competing libs have complex APIs | MEDIUM | `<Gantt tasks={tasks} onChange={fn} />` |
| **TypeScript-first** | Type safety out of the box | LOW | Generated types, not authored separately |
| **Accessibility built-in** | Most charts ignore a11y entirely | HIGH | Keyboard nav, ARIA, screen reader support |
| **Month-only optimization** | Competitors try to do everything | LOW | Lean implementation, no zoom complexity |
| **Server component friendly** | Next.js App Router compatibility | MEDIUM | RSC support, no client-only requirement |
| **Extremely small bundle** | <10KB gzipped vs 100KB+ competitors | HIGH | Most popular libs are bloated |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Task dependencies** | "Real projects have dependencies" | Adds massive complexity, requires scheduling engine, conflicts with drag-drop when dates locked | For v1: No dependencies, users manage manually. Later: Opt-in via plugin |
| **Auto-scheduling** | "Should recalculate dates automatically" | Requires constraint solver, unpredictable behavior, confusing UX | Manual scheduling only, predictably simple |
| **Resource management** | "Need to assign people to tasks" | Doubles complexity, requires resource availability UI, outside scope | Keep tasks focused, separate resource concerns |
| **Critical path calculation** | "Project management essential" | Dependency graph algorithm, complex state management | External tools for PM pros, simple view for rest |
| **Multiple zoom levels** | "Users want day/week/month views" | Each level needs different rendering, state management | Month view only (stated requirement) |
| **Export to PDF/PNG** | "Need to share charts" | Requires heavy libraries (html2canvas, jsPDF), bloats bundle | Browser print, user controls export |
| **Real-time collaboration** | "Teams need to see updates" | Requires WebSocket, CRDT, auth, backend | Simple optimistic UI, let app layer handle sync |
| **Undo/redo** | "Users make mistakes" | Complex state management, requires action queue | Browser undo handles most, or app-level implementation |
| **Inline editing** | "Click to edit task name" | UX complexity, focus management, state conflicts | Modal/slide-out panel is simpler and cleaner |
| **Milestone markers** | "Need to mark important dates" | Different rendering path, special cases, edge cases | Zero-duration tasks work, keep consistent |
| **Task splitting** | "Need to interrupt tasks" | UI complexity, data model complexity | Multiple task bars, simpler mental model |
| **Progress tracking** | "Need completion percentage" | Another dimension to manage, UX complexity | Task status (todo/done) is sufficient for v1 |
| **Custom time scales** | "Need quarters/weeks/custom" | Date math complexity, rendering complexity | Month view only (stated requirement) |
| **Filtering/search** | "Need to find tasks" | UI complexity, state management | App layer filters before passing to component |
| **Virtual scroll** | "Need to handle 10k tasks" | High implementation complexity | For 100-task requirement, not needed |

## Feature Dependencies

```
[Timeline visualization]
    └──requires──> [Date header/axis]
    └──requires──> [Task bars rendering]

[Drag-to-resize tasks]
    └──requires──> [Task bars rendering]
    └──requires──> [Date header/axis]

[Drag-to-move tasks]
    └──requires──> [Task bars rendering]
    └──requires──> [Date header/axis]
    └──enhances──> [Task CRUD operations]

[Task list/table view]
    └──requires──> [Task IDs/identifiers]
    └──synchronized──> [Task bars rendering]

[Today indicator]
    └──requires──> [Timeline visualization]
    └──requires──> [Date header/axis]

[Performance at 1000+ tasks] (differentiator)
    └──requires──> [Task bars rendering]
    └──requires──> [Task list/table view]
```

### Dependency Notes

- **Timeline visualization requires Date header/axis:** Users need temporal context to understand task placement
- **Drag operations require Task bars rendering:** Can't interact with what isn't rendered
- **Task list synchronized with Task bars:** Scrolling, selection, and visibility must stay in sync
- **Today indicator requires Timeline visualization:** Only meaningful within the timeline context
- **Performance optimization requires core features first:** Can't optimize what doesn't exist

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Timeline visualization** — Core value proposition, shows tasks over time
- [ ] **Task bars rendering** — Visual representation of task duration on the timeline
- [ ] **Date header/axis** — Month-based temporal context across the top
- [ ] **Task list/table view** — Left sidebar showing task names, synchronized with timeline
- [ ] **Task IDs/identifiers** — Required for React rendering and updates
- [ ] **Today indicator** — Vertical line showing current date
- [ ] **Basic styling/theming** — CSS variables for integration
- [ ] **Drag-to-resize tasks** — Drag edges to change duration (MEDIUM complexity, table stakes)
- [ ] **Drag-to-move tasks** — Drag bar to shift in time (MEDIUM complexity, table stakes)

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Task CRUD operations** — Full create/update/delete if partial in v1
- [ ] **TypeScript-first** — If starting with JS, add proper types
- [ ] **Accessibility built-in** — Keyboard navigation, ARIA labels
- [ ] **Simple API surface** — Ensure `<Gantt tasks={tasks} />` works
- [ ] **Performance optimization** — If users hit limits, add virtualization

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Task dependencies** — Only if users demand, high complexity
- [ ] **Progress tracking** — Add completion % if workflows require
- [ ] **Multiple zoom levels** — Week/day views if month-only is limiting
- [ ] **Resource management** — Separate product concern, not core Gantt
- [ ] **Export functionality** - User-driven, not core to charting

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Timeline visualization | HIGH | LOW | P1 |
| Task bars rendering | HIGH | LOW | P1 |
| Date header/axis | HIGH | LOW | P1 |
| Task list/table view | HIGH | MEDIUM | P1 |
| Today indicator | MEDIUM | LOW | P1 |
| Drag-to-resize tasks | HIGH | MEDIUM | P1 |
| Drag-to-move tasks | HIGH | MEDIUM | P1 |
| Task IDs/identifiers | HIGH | LOW | P1 |
| Basic styling/theming | MEDIUM | LOW | P1 |
| Task CRUD operations | HIGH | MEDIUM | P2 |
| TypeScript-first | HIGH | LOW | P2 |
| Accessibility built-in | MEDIUM | HIGH | P2 |
| Performance at 1000+ tasks | MEDIUM | HIGH | P2 |
| Tree-shakeable API | LOW | MEDIUM | P3 |
| True zero dependencies | MEDIUM | HIGH | P3 |
| Simple API surface | HIGH | MEDIUM | P2 |
| Server component friendly | MEDIUM | MEDIUM | P2 |
| Extremely small bundle | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (table stakes)
- P2: Should have, add when possible (differentiators or high-value table stakes)
- P3: Nice to have, future consideration (differentiators with high cost)

## Competitor Feature Analysis

| Feature | react-gantt-chart | @worktile/gantt | DHTMLX Gantt | Our Approach |
|---------|-------------------|-----------------|--------------|--------------|
| Timeline | Yes | Yes | Yes | Yes (month-only) |
| Task list | Yes | Yes | Yes | Yes (simple table) |
| Drag operations | Yes | Yes | Yes | Yes (resize + move) |
| Dependencies | Yes | Yes | Yes | **No** (anti-feature for v1) |
| Auto-scheduling | No | Yes | Yes | **No** (manual only) |
| Resource mgmt | No | No | Yes | **No** (out of scope) |
| Zoom levels | Day/Week/Month | Day/Week/Month | Day/Week/Month/Quarter | **Month only** (requirement) |
| Bundle size | ~50KB | ~80KB | ~150KB | **<10KB** (goal) |
| Dependencies | 2-5 | 5-10 | 0 (but monolithic) | **0** (true zero-dep) |
| TypeScript | Yes | Yes | Yes | **Yes** (first-class) |
| License | MIT | MIT | Commercial (GPL) | **MIT** |
| Accessibility | Poor | Poor | Poor | **Good** (differentiator) |

## Notes for Specific Context

### Lightweight Next.js Library Requirements

Given the project context:
- **Small projects (~100 tasks)**: Performance optimizations can wait (v1.x)
- **Month view only**: Avoid multi-zoom complexity entirely
- **No dependencies**: Keep implementation pure, no d3/date-fns/moment
- **Minimal feature set**: Focus on bars + calendar + drag-drop, nothing more
- **Next.js friendly**: RSC support, no client-only requirements

### Recommended Scope for v1

**DO build:**
- Month-based timeline with date headers
- Task bars (start date, end date, label)
- Left task list (name, synced scroll)
- Drag edges to resize
- Drag bar to move
- Today line indicator
- CSS variable theming

**DON'T build (yet):**
- Task dependencies (complex, anti-feature for minimal use case)
- Progress tracking (can add later)
- Multiple zoom levels (explicitly month-only)
- Inline editing (use modal/app layer)
- Export (browser print is sufficient)
- Undo/redo (app layer concern)

**Build differently:**
- Instead of complex configuration: simple props API
- Instead of heavy dependencies: native Date API
- Instead of full CRUD: start with read + drag, add write later
- Instead of theming system: CSS variables, user brings own CSS

## Sources

**Note: Web services were rate-limited during research. Analysis based on:**
- Domain knowledge of Gantt chart libraries (Frappe Gantt, DHTMLX, react-gantt-chart, @worktile/gantt)
- Common feature sets in project management tools (Monday.com, Asana, ClickUp, MS Project)
- React component library patterns and best practices
- Next.js App Router and Server Components requirements
- Bundle size optimization strategies

**Confidence: MEDIUM** - Limited by inability to verify current library documentation via web search. Would benefit from verification of:
- Current feature sets of major React Gantt libraries
- Latest bundle size benchmarks
- Current accessibility implementations in competing libraries

**Recommended verification before roadmap finalization:**
- Check current react-gantt-chart and @worktile/gantt documentation
- Review Frappe Gantt feature set (popular lightweight option)
- Analyze DHTMLX Gantt free vs feature comparison

---
*Feature research for: Lightweight React Gantt Chart Library*
*Researched: 2026-02-18*

---
phase: quick-63
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/GridBackground/GridBackground.tsx
  - packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
autonomous: true
requirements:
  - FIX-GRID-BG-MEMO
  - OPT-CASCADE-DRAG
must_haves:
  truths:
    - "GridBackground re-renders when totalHeight changes (rows added/removed)"
    - "GridBackground does NOT re-render when only unrelated state changes"
    - "Cascade drag with 100 tasks produces noticeably less jank than before"
    - "DependencyLines SVG stays updated during cascade drag (may lag slightly)"
    - "Hard and soft cascade mode still work correctly after optimization"
  artifacts:
    - path: "packages/gantt-lib/src/components/GridBackground/GridBackground.tsx"
      provides: "Fixed arePropsEqual — !==  changed to ==="
    - path: "packages/gantt-lib/src/components/GanttChart/GanttChart.tsx"
      provides: "Throttled cascade setState — 1 update per 3 RAF frames"
  key_links:
    - from: "GanttChart cascadeOverrides state"
      to: "TaskRow overridePosition prop"
      via: "cascadeOverrides.get(task.id)"
      pattern: "cascadeOverrides\\.get"
    - from: "GanttChart cascadeOverrides state"
      to: "DependencyLines dragOverrides prop"
      via: "dependencyOverrides useMemo"
      pattern: "dependencyOverrides"
---

<objective>
Fix an inverted boolean bug in GridBackground.arePropsEqual that prevents re-renders
on totalHeight changes, and reduce cascade drag jank by throttling cascadeOverrides
setState to fire once every 3 RAF frames instead of every frame.

Purpose: Correctness fix (GridBackground) and performance fix (cascade drag on large charts).
Output: Two modified files with targeted, minimal changes.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix GridBackground.arePropsEqual inverted condition</name>
  <files>packages/gantt-lib/src/components/GridBackground/GridBackground.tsx</files>
  <action>
Change line 27 in GridBackground.tsx:

BEFORE:
```tsx
prevProps.totalHeight !== nextProps.totalHeight // totalHeight changes still trigger update
```

AFTER:
```tsx
prevProps.totalHeight === nextProps.totalHeight // skip re-render only when totalHeight unchanged
```

The `!==` operator was inverted: it returned `true` (skip re-render) when totalHeight CHANGED,
and `false` (force re-render) when it stayed the same — the exact opposite of correct behavior.
Fix: change `!==` to `===`. Update the comment to reflect correct semantics.

Do not change anything else in the file.
  </action>
  <verify>
    <automated>grep -n "totalHeight" packages/gantt-lib/src/components/GridBackground/GridBackground.tsx</automated>
  </verify>
  <done>Line reads `prevProps.totalHeight === nextProps.totalHeight` with no `!==` in the arePropsEqual function.</done>
</task>

<task type="auto">
  <name>Task 2: Throttle cascadeOverrides setState to every 3 RAF frames</name>
  <files>packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</files>
  <action>
Add a frame-counter ref near the cascadeOverrides state declaration (line ~168):

```tsx
// Frame counter for throttling cascade setState — only update every N frames
const cascadeFrameCountRef = useRef(0);
const CASCADE_THROTTLE_FRAMES = 3;
```

Then update `handleCascadeProgress` (currently lines ~404-406) to skip setState on most frames:

BEFORE:
```tsx
const handleCascadeProgress = useCallback((overrides: Map<string, { left: number; width: number }>) => {
  setCascadeOverrides(new Map(overrides));
}, []);
```

AFTER:
```tsx
const handleCascadeProgress = useCallback((overrides: Map<string, { left: number; width: number }>) => {
  cascadeFrameCountRef.current += 1;
  if (cascadeFrameCountRef.current % CASCADE_THROTTLE_FRAMES !== 0) return;
  setCascadeOverrides(new Map(overrides));
}, []);
```

Also reset the frame counter when cascade drag ends. Cascade drag clears overrides by calling
`handleCascadeProgress(new Map())` (see Phase 07-01 decision: "completeDrag() emits onCascadeProgress(new Map())
before completing"). Detect the empty map and reset the counter + always flush it:

```tsx
const handleCascadeProgress = useCallback((overrides: Map<string, { left: number; width: number }>) => {
  if (overrides.size === 0) {
    // Drag ended — always flush the clear and reset counter
    cascadeFrameCountRef.current = 0;
    setCascadeOverrides(new Map());
    return;
  }
  cascadeFrameCountRef.current += 1;
  if (cascadeFrameCountRef.current % CASCADE_THROTTLE_FRAMES !== 0) return;
  setCascadeOverrides(new Map(overrides));
}, []);
```

Place the two const declarations immediately after the existing `cascadeOverrides` useState line.
Do not change any other code.

Rationale: This reduces GanttChart re-renders during cascade drag by ~67% (1 in 3 frames instead
of every frame), cutting the 100 × TaskRow memo-check chain to ~33 checks per second instead of
~100. DependencyLines SVG will update every 3 frames (~50ms lag at 60fps) which is imperceptible.
  </action>
  <verify>
    <automated>grep -n "CASCADE_THROTTLE_FRAMES\|cascadeFrameCountRef\|handleCascadeProgress" packages/gantt-lib/src/components/GanttChart/GanttChart.tsx</automated>
  </verify>
  <done>
    handleCascadeProgress contains the frame-counter throttle logic. overrides.size === 0 path
    always calls setCascadeOverrides and resets the counter. The throttle path skips setState
    for 2 of every 3 frames.
  </done>
</task>

</tasks>

<verification>
Manual smoke test:
1. Open the demo chart with 10+ tasks that have cascade dependencies.
2. Drag a predecessor task — verify chain tasks visually preview their new positions (may update slightly choppier than before, 3-frame lag is acceptable).
3. Release drag — verify final positions are applied correctly, no stuck preview positions.
4. Add/remove a task row — verify GridBackground height updates visually (rows filled correctly, no clipping).
5. npm run build from packages/gantt-lib passes with no TypeScript errors.
</verification>

<success_criteria>
- GridBackground.arePropsEqual uses === not !== for totalHeight comparison.
- handleCascadeProgress skips setCascadeOverrides for 2 out of 3 frames; always flushes on empty map.
- No TypeScript compilation errors.
- Cascade drag still shows preview positions for chain tasks and clears correctly on release.
</success_criteria>

<output>
After completion, create `.planning/quick/63-fix-gridbackground-arepropsequal-bug-and/63-SUMMARY.md`
</output>
```

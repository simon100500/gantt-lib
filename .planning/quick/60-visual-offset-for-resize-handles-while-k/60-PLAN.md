---
phase: quick
plan: 60
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "Resize handles appear offset from task bar edges (not flush)"
    - "20px activation zone still works when clicking near edges"
    - "Visual handles are centered within the 20px activation zone"
  artifacts:
    - path: "packages/gantt-lib/src/components/TaskRow/TaskRow.css"
      provides: "Resize handle styling with visual offset"
      contains: ".gantt-tr-resizeHandle"
  key_links:
    - from: ".gantt-tr-resizeHandleLeft"
      to: "task bar left edge"
      via: "CSS positioning with offset"
      pattern: "left: [offset]"
    - from: ".gantt-tr-resizeHandleRight"
      to: "task bar right edge"
      via: "CSS positioning with offset"
      pattern: "right: [offset]"
---

<objective>
Add visual offset to resize handles while maintaining the 20px activation zone

Purpose: Improve visual design by showing handles offset from edges without breaking the interaction zone
Output: Resize handles that appear 6px from edges (centered in 20px zone) but activate within 20px of edges
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/gantt-lib/src/components/TaskRow/TaskRow.css
@packages/gantt-lib/src/components/TaskRow/TaskRow.tsx
@packages/gantt-lib/src/hooks/useTaskDrag.ts

# Current Implementation
From TaskRow.css (lines 91-122):
```css
.gantt-tr-resizeHandle {
  position: absolute;
  top: 0;
  width: 8px;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  cursor: ew-resize;
  pointer-events: auto;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.gantt-tr-resizeHandleLeft {
  left: 0;
}

.gantt-tr-resizeHandleRight {
  right: 0;
}
```

From TaskRow.tsx (line 196):
- `edgeZoneWidth: 20` - the activation zone is 20px from each edge
- Resize handles are rendered at lines 260 and 269
- The visual handles are currently flush with edges (left: 0, right: 0)

# Problem
Reducing CSS `width` reduces both visual size AND click zone. Need visual offset while keeping full 20px activation.

# Solution
Use CSS to create visual offset while keeping full element width for activation:
- Increase handle width to 20px (matches activation zone)
- Use `background-clip: content-box` with padding to create visual inset
- Or use `border` to create visual inset
- Center the 8px visual handle within the 20px activation zone (6px offset from each edge)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update resize handle CSS for visual offset</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.css</files>
  <action>
Modify .gantt-tr-resizeHandle, .gantt-tr-resizeHandleLeft, and .gantt-tr-resizeHandleRight styles:

1. Change .gantt-tr-resizeHandle width from 8px to 20px (matches edgeZoneWidth)
2. Add visual offset using one of these techniques (choose the cleaner approach):

Option A (using padding + background-clip):
```css
.gantt-tr-resizeHandle {
  position: absolute;
  top: 0;
  width: 20px;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  background-clip: content-box;
  padding-left: 6px;
  padding-right: 6px;
  cursor: ew-resize;
  pointer-events: auto;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.15s ease;
  box-sizing: border-box;
}
```

Option B (using box-shadow inset):
```css
.gantt-tr-resizeHandle {
  position: absolute;
  top: 0;
  width: 20px;
  height: 100%;
  background-color: transparent;
  cursor: ew-resize;
  pointer-events: auto;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.gantt-tr-resizeHandle::before {
  content: '';
  position: absolute;
  top: 0;
  left: 6px;
  width: 8px;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}
```

3. Keep .gantt-tr-resizeHandleLeft { left: 0; } and .gantt-tr-resizeHandleRight { right: 0; }
4. Keep hover state and opacity transition unchanged

This creates an 8px visual handle centered within the 20px activation zone (6px inset from each edge).
</action>
  <verify>
<automated>grep -A 3 "\.gantt-tr-resizeHandle {" packages/gantt-lib/src/components/TaskRow/TaskRow.css | grep -E "width: 20px|padding|background-clip"</automated>
</verify>
  <done>Resize handles show 6px offset from edges visually while 20px activation zone works</done>
</task>

</tasks>

<verification>
1. Hover over task bar - handles should appear offset from edges (not flush)
2. Click within 20px of edge - resize should activate (test activation zone)
3. Click at 6px from edge - should hit the visual handle
4. Visual handle should appear 8px wide centered in 20px zone
</verification>

<success_criteria>
- Visual handles appear 6px from task bar edges
- 20px activation zone still functions correctly
- Handle hover state works as before
- No TypeScript errors
- Visual result: 8px dark handle centered in 20px zone (6px offset on each side)
</success_criteria>

<output>
After completion, create `.planning/quick/60-visual-offset-for-resize-handles-while-k/60-SUMMARY.md`
</output>

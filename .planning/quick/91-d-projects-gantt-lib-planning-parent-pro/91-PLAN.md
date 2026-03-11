---
phase: quick-091
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/gantt-lib/src/components/TaskRow/TaskRow.css
  - packages/gantt-lib/src/styles.css
autonomous: true
requirements:
  - QUICK-091-PARENT-STYLING
must_haves:
  truths:
    - Parent task bar displays with bracket-style appearance (trapezoid ears at bottom)
    - Parent bar uses darker color (#333333) instead of gradient
    - Parent bar height is 14px (thinner than child tasks)
    - Top corners are rounded, bottom has trapezoid ears
  artifacts:
    - path: packages/gantt-lib/src/components/TaskRow/TaskRow.css
      provides: Parent task bar bracket styling with pseudo-elements
      contains: ".gantt-tr-parentBar::before", ".gantt-tr-parentBar::after"
    - path: packages/gantt-lib/src/styles.css
      provides: CSS variables for parent task styling
      contains: "--gantt-parent-bar-color", "--gantt-bracket-*"
  key_links:
    - from: ".gantt-tr-parentBar"
      to: "CSS ::before and ::after pseudo-elements"
      via: "clip-path polygon for trapezoid shape"
      pattern: "clip-path.*polygon"
---

<objective>
Implement MS Project-style parent task bar with bracket appearance (trapezoid ears at bottom)

Purpose: Match MS Project visual language for summary tasks — distinctive bracket shape that clearly indicates parent/summary tasks vs regular tasks
Output: Parent task bars with dark bracket styling (14px height, trapezoid ears, rounded top)
</objective>

<execution_context>
@D:\Projects\gantt-lib\.planning\get-shit-done\workflows\execute-plan.md
@D:\Projects\gantt-lib\.planning\get-shit-done\templates\summary.md
</execution_context>

<context>
@d:\Projects\gantt-lib\.planning\parent-prototype.html
@D:\Projects\gantt-lib\packages\gantt-lib\src\components\TaskRow\TaskRow.css
@D:\Projects\gantt-lib\packages\gantt-lib\src\styles.css
@D:\Projects\gantt-lib\.planning\STATE.md

## Reference Prototype (parent-prototype.html)

The HTML prototype demonstrates MS Project-style summary task with:
- Dark color: #333333
- Bar height: 14px (--bracket-thickness)
- Top border-radius: 8px (--border-radius-val)
- Trapezoid ears: 8px depth (--ear-depth), 10px width (--ear-width)
- Clip-path polygons for ear shapes (60%/40% inward angles)

```css
.summary-task {
    height: 14px;
    background-color: #333333;
    border-radius: 8px 8px 0 0;
}

.summary-task::before,
.summary-task::after {
    content: "";
    position: absolute;
    top: 14px;
    height: 8px;
    width: 10px;
    background-color: #333333;
}

.summary-task::before {
    left: 0;
    clip-path: polygon(0 0, 100% 0, 60% 100%, 0 100%);
}

.summary-task::after {
    right: 0;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 40% 100%);
}
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update parent task CSS variables in styles.css</name>
  <files>packages/gantt-lib/src/styles.css</files>
  <action>
Update the Parent Task Styling section in styles.css to match MS Project bracket style:

1. Change --gantt-parent-bar-color from #6366f1 to #333333
2. Remove --gantt-parent-bar-color-end (no gradient needed)
3. Add new CSS variables for bracket geometry:
   - --gantt-parent-bar-height: 14px
   - --gantt-parent-bar-radius: 8px
   - --gantt-parent-ear-depth: 8px
   - --gantt-parent-ear-width: 10px

Do NOT change existing gradient variables yet — Task 2 will handle the CSS classes.
  </action>
  <verify>
grep -n "gantt-parent" packages/gantt-lib/src/styles.css | grep -E "(--gantt-parent-bar-height|--gantt-parent-bar-radius|--gantt-parent-ear|--gantt-parent-bar-color.*#333)"
  </verify>
  <done>CSS variables updated with MS Project bracket dimensions (#333333 color, 14px height, 8px ear depth, 10px ear width)</done>
</task>

<task type="auto">
  <name>Task 2: Implement bracket styling in TaskRow.css</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.css</files>
  <action>
Replace the current .gantt-tr-parentBar styles with MS Project bracket-style implementation:

1. Update .gantt-tr-parentBar:
   - Remove gradient background, use solid: var(--gantt-parent-bar-color, #333333)
   - Set height: var(--gantt-parent-bar-height, 14px)
   - Set border-radius: var(--gantt-parent-bar-radius, 8px) var(--gantt-parent-bar-radius, 8px) 0 0 (top only)
   - Remove box-shadow (MS Project style is flat)

2. Add pseudo-elements for trapezoid ears:
   ```css
   .gantt-tr-parentBar::before,
   .gantt-tr-parentBar::after {
     content: "";
     position: absolute;
     top: var(--gantt-parent-bar-height, 14px);
     height: var(--gantt-parent-ear-depth, 8px);
     width: var(--gantt-parent-ear-width, 10px);
     background-color: var(--gantt-parent-bar-color, #333333);
   }

   .gantt-tr-parentBar::before {
     left: 0;
     clip-path: polygon(0 0, 100% 0, 60% 100%, 0 100%);
   }

   .gantt-tr-parentBar::after {
     right: 0;
     clip-path: polygon(0 0, 100% 0, 100% 100%, 40% 100%);
   }
   ```

3. Keep .gantt-tr-parentIcon unchanged (folder icon still used)

This creates the distinctive bracket shape with ears angled inward (60%/40%).
  </action>
  <verify>
grep -A 10 "\.gantt-tr-parentBar::before" packages/gantt-lib/src/components/TaskRow/TaskRow.css | grep -E "(clip-path|polygon)"
  </verify>
  <done>Parent task bar renders with MS Project bracket appearance (dark color, 14px height, trapezoid ears)</done>
</task>

<task type="auto">
  <name>Task 3: Update TaskRow component for parent bar height</name>
  <files>packages/gantt-lib/src/components/TaskRow/TaskRow.tsx</files>
  <action>
Update the TaskRow component to use the parent bar height variable:

1. Find the inline style for task bar height (line ~273: `height: 'var(--gantt-task-bar-height)'`)
2. Change to use conditional height based on isParent:
   - If isParent: use `height: 'var(--gantt-parent-bar-height, 14px)'`
   - Otherwise: keep `height: 'var(--gantt-task-bar-height)'`

This ensures parent bars render at 14px while child bars remain at default height (24px).

Alternative approach: Keep current code and rely on CSS override:
- Add to TaskRow.css: `.gantt-tr-parentBar { height: var(--gantt-parent-bar-height, 14px) !important; }`

Use the CSS approach (simpler, no TypeScript change needed).
  </action>
  <verify>
grep -n "gantt-tr-parentBar" packages/gantt-lib/src/components/TaskRow/TaskRow.css | grep "height.*var(--gantt-parent-bar-height"
  </verify>
  <done>Parent task bar renders at 14px height via CSS variable override</done>
</task>

</tasks>

<verification>
Visual verification in browser:
1. Open test page with parent tasks (e.g., Construction Project demo)
2. Verify parent task bars appear dark (#333333)
3. Verify parent bars are thinner (14px) than child tasks
4. Verify trapezoid "ears" visible at bottom of parent bars
5. Verify top corners rounded, bottom has angled ears
</verification>

<success_criteria>
- Parent task bars use MS Project bracket styling
- Dark color (#333333) replaces gradient
- 14px height with 8px ear depth
- Trapezoid ears created via clip-path pseudo-elements
- CSS variables exposed for customization
</success_criteria>

<output>
After completion, create `.planning/quick/91-d-projects-gantt-lib-planning-parent-pro/91-01-SUMMARY.md`
</output>

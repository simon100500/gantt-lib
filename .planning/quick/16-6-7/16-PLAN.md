---
phase: quick-16-6-7
plan: 16
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/website/src/app/page.tsx
autonomous: true
requirements: [DEMO-01]

must_haves:
  truths:
    - "The main Construction Project chart shows 6-7 visible dependency arrows between tasks"
    - "Dependencies follow realistic construction sequencing (FS links)"
    - "The main chart compiles and renders without errors"
  artifacts:
    - path: "packages/website/src/app/page.tsx"
      provides: "Updated createSampleTasks with dependencies on first 7-8 tasks"
      contains: "dependencies:"
  key_links:
    - from: "createSampleTasks"
      to: "GanttChart tasks prop"
      via: "useState initial value"
      pattern: "dependencies.*taskId"
---

<objective>
Add 6-7 dependency links to the main Construction Project GanttChart demo so the chart looks rich and connected for demo purposes.

Purpose: The main chart currently has 64 construction tasks with no dependencies — adding realistic FS links between the early tasks (preparatory stage and earthwork) makes the demo visually compelling and showcases the dependency-lines feature.
Output: Updated `createSampleTasks` in `packages/website/src/app/page.tsx` with `dependencies` arrays on 6-7 tasks.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/website/src/app/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add 6-7 FS dependencies to createSampleTasks</name>
  <files>packages/website/src/app/page.tsx</files>
  <action>
In `createSampleTasks`, add `dependencies` fields to the following tasks. These form a realistic FS chain through the preparatory and earthwork stages — the tasks are already ordered chronologically so the links are visually obvious:

1. Task "2" (Ограждение строительной площадки) — depends on task "1" (Геодезическая разбивка) FS:
   `dependencies: [{ taskId: '1', type: 'FS' as const }]`

2. Task "3" (Временные дороги) — depends on task "2" (Ограждение) FS:
   `dependencies: [{ taskId: '2', type: 'FS' as const }]`

3. Task "8" (Вывоз гумуса) — depends on task "7" (Мобильный кран) FS:
   `dependencies: [{ taskId: '7', type: 'FS' as const }]`

4. Task "9" (Срезка растительного слоя) — depends on task "8" (Вывоз гумуса) FS:
   `dependencies: [{ taskId: '8', type: 'FS' as const }]`

5. Task "10" (Планировка площадки) — depends on task "9" (Срезка) FS:
   `dependencies: [{ taskId: '9', type: 'FS' as const }]`

6. Task "11" (Разработка котлована) — depends on task "10" (Планировка) FS:
   `dependencies: [{ taskId: '10', type: 'FS' as const }]`

7. Task "12" (Уплотнение основания котлована) — depends on task "11" (Разработка котлована) FS:
   `dependencies: [{ taskId: '11', type: 'FS' as const }]`

That gives 7 dependency arrows total. Do NOT touch any other part of the file — only add `dependencies` arrays to those specific task objects inside `createSampleTasks`. The `type` must be cast with `as const` to satisfy TypeScript strict mode.
  </action>
  <verify>
Run `npm run build --workspace=packages/gantt-lib 2>/dev/null; npm run build --workspace=packages/website 2>/dev/null` or simply check that the TypeScript compiles: `cd packages/website && npx tsc --noEmit`. If the dev server is running, visit http://localhost:3000 and confirm arrows are visible in the Construction Project chart.
  </verify>
  <done>
`packages/website/src/app/page.tsx` compiles without TypeScript errors. The main Construction Project GanttChart renders with 7 dependency arrows connecting preparatory-stage and earthwork tasks.
  </done>
</task>

</tasks>

<verification>
- TypeScript compiles cleanly (no new errors)
- Main chart shows dependency arrows (not just the dependency/cascade demo sections)
- No changes to `createDependencyTasks` or `createCascadeTasks`
</verification>

<success_criteria>
7 FS dependency links exist in `createSampleTasks`, connecting the realistic construction sequence: 1→2→3, 7→8→9→10→11→12. Chart renders dependency arrows in the Construction Project section.
</success_criteria>

<output>
After completion, create `.planning/quick/16-6-7/16-SUMMARY.md` with what was changed, files modified, and the dependency pairs added.
</output>

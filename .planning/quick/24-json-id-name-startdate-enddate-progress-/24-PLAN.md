---
phase: quick-24
plan: 24
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/website/src/app/page.tsx
autonomous: true
requirements: [QUICK-24]

must_haves:
  truths:
    - "A 'Export JSON' button appears below the Construction Project chart"
    - "Clicking the button copies JSON to clipboard (or downloads a file)"
    - "The JSON array contains all tasks from the first chart"
    - "Each task object has exactly: id, name, startDate, endDate, progress, accepted, dependencies"
    - "accepted field is present (false when not set, true when task.accepted === true)"
    - "dependencies is an array of {taskId, type, lag} objects (empty array when no deps)"
  artifacts:
    - path: "packages/website/src/app/page.tsx"
      provides: "exportTasksAsJson function + Export JSON button in Construction Project section"
  key_links:
    - from: "Export JSON button"
      to: "tasks state"
      via: "onClick handler calling exportTasksAsJson(tasks)"
      pattern: "exportTasksAsJson"
---

<objective>
Add a JSON export button to the Construction Project (first chart) on the demo page. Clicking it exports all current tasks as a JSON array with fields: id, name, startDate, endDate, progress, accepted, dependencies.

Purpose: Lets users inspect and copy the task data model as it evolves during drag interactions.
Output: Export button in the demo page, JSON copied to clipboard or downloaded as file.
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
  <name>Task 1: Add exportTasksAsJson function and Export JSON button to Construction Project section</name>
  <files>packages/website/src/app/page.tsx</files>
  <action>
In `packages/website/src/app/page.tsx`, add the following:

1. Add a `exportTasksAsJson` function (outside the component or as a `useCallback`) that:
   - Takes `Task[]` as input
   - Maps each task to an object with exactly these fields:
     ```ts
     {
       id: task.id,
       name: task.name,
       startDate: task.startDate,
       endDate: task.endDate,
       progress: task.progress ?? 0,
       accepted: task.accepted ?? false,
       dependencies: (task.dependencies ?? []).map(dep => ({
         taskId: dep.taskId,
         type: dep.type,
         lag: dep.lag ?? 0,
       })),
     }
     ```
   - Serializes the array with `JSON.stringify(result, null, 2)`
   - Copies to clipboard via `navigator.clipboard.writeText(json)` and shows `alert('JSON copied to clipboard!')`, OR falls back to creating a `<a>` element with a `data:` URL and triggering a download of `tasks.json` if clipboard is unavailable

2. In the JSX, inside the "Construction Project" `<div style={{ marginBottom: "3rem" }}>` section, immediately after the closing `</div>` of the chart wrapper (after `</GanttChart>` container div), add a button:
   ```tsx
   <div style={{ marginTop: "0.75rem" }}>
     <button
       onClick={() => exportTasksAsJson(tasks)}
       style={{
         padding: "0.375rem 0.75rem",
         fontSize: "0.875rem",
         backgroundColor: "#f3f4f6",
         border: "1px solid #d1d5db",
         borderRadius: "6px",
         cursor: "pointer",
       }}
     >
       Export JSON
     </button>
   </div>
   ```

Keep all existing state, handlers, and other chart sections completely unchanged.
  </action>
  <verify>
Run the dev server: `cd D:/Projects/gantt-lib && npm run dev -w packages/website`
Open http://localhost:3000, scroll to "Construction Project", click "Export JSON" button.
Check that clipboard (or download) contains valid JSON with fields: id, name, startDate, endDate, progress, accepted, dependencies.
Verify `accepted` is `true` for task id "1" (has `accepted: true` in source) and `false` for tasks without it.
Verify `dependencies` is an array for all tasks (empty array for tasks with no deps).
  </verify>
  <done>
"Export JSON" button visible in Construction Project section. Click produces valid JSON array where every task object has all 7 required fields with correct types. No TypeScript compilation errors.
  </done>
</task>

</tasks>

<verification>
- `npm run build -w packages/website` completes without TypeScript errors
- JSON output includes all 22 tasks from createSampleTasks()
- Task "1" has `accepted: true`, task "2" has `accepted: false`
- Task "4" dependencies array contains `{taskId: "2", type: "FS", lag: 3}`
- Tasks with no dependencies have `dependencies: []`
</verification>

<success_criteria>
Export JSON button present on demo page. One click exports all current Construction Project tasks as JSON with fields id, name, startDate, endDate, progress, accepted, dependencies. No regressions to other charts.
</success_criteria>

<output>
After completion, create `.planning/quick/24-json-id-name-startdate-enddate-progress-/24-SUMMARY.md`
</output>

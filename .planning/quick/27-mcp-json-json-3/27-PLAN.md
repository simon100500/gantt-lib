---
phase: quick-27
plan: 27
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/website/src/app/mcp/page.tsx
  - packages/website/public/tasks.json
autonomous: true
requirements: [QUICK-27]
must_haves:
  truths:
    - User can navigate to /mcp route and see a Gantt chart
    - Tasks are loaded from tasks.json file
    - The chart displays 3 tasks as specified
  artifacts:
    - path: packages/website/src/app/mcp/page.tsx
      provides: MCP test page with Gantt chart
      exports: default function
    - path: packages/website/public/tasks.json
      provides: Sample task data for 3 works
      contains: array of 3 task objects
  key_links:
    - from: packages/website/src/app/mcp/page.tsx
      to: packages/website/public/tasks.json
      via: fetch() call to /tasks.json
      pattern: "fetch.*tasks\\.json"
---

<objective>
Create a test page at /mcp route that displays a Gantt chart with tasks loaded from a JSON file.

Purpose: Provide a simple test page for MCP (Model Context Protocol) integration that loads task data from an external JSON file.
Output: Working /mcp page with 3 sample tasks loaded from JSON.
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@packages/website/src/app/page.tsx
@packages/gantt-lib/src/types/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create public directory and tasks.json file</name>
  <files>packages/website/public/tasks.json</files>
  <action>
    Create the public directory in packages/website/ if it doesn't exist, then create tasks.json with 3 sample tasks.

    The JSON file should contain an array of 3 tasks following the Task interface structure:
    - id: string (unique identifier)
    - name: string (task display name)
    - startDate: string (ISO date format)
    - endDate: string (ISO date format)
    - progress: number (0-100, optional)
    - color: string (hex color, optional)
    - dependencies: array of dependency objects (optional)

    Example tasks (3 works with realistic construction project data):
    1. "Подготовка участка" - Feb 1 to Feb 5, 100% complete
    2. "Заливка фундамента" - Feb 6 to Feb 12, 60% complete, depends on task 1 (FS)
    3. "Возведение стен" - Feb 13 to Feb 20, 30% complete, depends on task 2 (FS)

    Use Russian names for tasks (consistent with main demo page). Use date format "YYYY-MM-DDTHH:mm:ss.sssZ" for dates.
  </action>
  <verify>File exists at packages/website/public/tasks.json with valid JSON array containing 3 task objects</verify>
  <done>tasks.json file created with 3 sample tasks in correct Task format</done>
</task>

<task type="auto">
  <name>Task 2: Create /mcp page that loads tasks from JSON</name>
  <files>packages/website/src/app/mcp/page.tsx</files>
  <action>
    Create a new Next.js page at packages/website/src/app/mcp/page.tsx that:

    1. Uses "use client" directive (client component)
    2. Imports GanttChart and Task type from "gantt-lib"
    3. Uses useState to store tasks array
    4. Uses useEffect to fetch tasks from /tasks.json on mount
    5. Renders a GanttChart component with the loaded tasks
    6. Includes error handling for failed fetch
    7. Includes loading state while fetching

    Page structure:
    - Heading: "MCP Test Page" or similar
    - Brief description: "Gantt chart with tasks loaded from tasks.json"
    - GanttChart component with:
      * tasks={tasks}
      * dayWidth={24}
      * rowHeight={36}
      * onChange handler to update state
    - Border container similar to main demo page

    Follow the same styling patterns as packages/website/src/app/page.tsx for consistency.
  </action>
  <verify>
    <automated>curl -s http://localhost:3000/mcp | grep -q "MCP" || echo "Page not accessible"</automated>
  </verify>
  <done>/mcp page loads and displays 3 tasks from tasks.json file</done>
</task>

</tasks>

<verification>
1. Navigate to http://localhost:3000/mcp
2. Verify the page loads without errors
3. Verify 3 tasks are displayed in the Gantt chart
4. Verify tasks can be dragged and resized (onChange works)
5. Verify tasks match the data in tasks.json file
</verification>

<success_criteria>
- /mcp route is accessible and renders a Gantt chart
- Tasks are successfully loaded from packages/website/public/tasks.json
- Chart displays exactly 3 tasks with correct dates, names, and dependencies
- Interactive features (drag, resize) work correctly
- Page styling is consistent with main demo page
</success_criteria>

<output>
After completion, create `.planning/quick/27-mcp-json-json-3/27-SUMMARY.md`
</output>

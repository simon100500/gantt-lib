---
phase: quick
plan: 087
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/website/src/app/page.tsx
  - packages/website/src/app/mcp/page.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "User can toggle task list visibility on all demo pages"
    - "Each demo section has its own show/hide button"
    - "Button text changes between 'Show Task List' and 'Hide Task List'"
  artifacts:
    - path: "packages/website/src/app/page.tsx"
      provides: "Multiple showTaskList states and toggle buttons for each demo section"
      contains: "useState for each demo section"
    - path: "packages/website/src/app/mcp/page.tsx"
      provides: "Show/hide task list button for MCP demo"
      contains: "showTaskList state and button"
  key_links:
    - from: "page.tsx demo sections"
      to: "GanttChart showTaskList prop"
      via: "state variable"
      pattern: "showTaskList={.*}"
---

<objective>
Add show/hide task list buttons to all test/demo chart pages

Purpose: Improve demo usability by allowing users to toggle task list visibility on each chart independently
Output: Each demo section will have its own toggle button for the task list
</objective>

<execution_context>
@C:/Users/simon/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/simon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Current Implementation Pattern
From packages/website/src/app/page.tsx (lines 580-588, 721):
```typescript
const [showTaskList, setShowTaskList] = useState(true);

<button onClick={() => setShowTaskList(!showTaskList)}>
  {showTaskList ? "Hide Task List" : "Show Task List"}
</button>

<GanttChart showTaskList={showTaskList} />
```

This pattern should be replicated for each demo section.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add show/hide task list buttons to all demo sections in main page</name>
  <files>packages/website/src/app/page.tsx</files>
  <action>
Add show/hide task list functionality to ALL demo sections in page.tsx:

1. For the main Construction Project demo (already has showTaskList state) - keep existing implementation

2. For Task Dependencies demo section (around line 730):
   - Add: const [showDependencyTaskList, setShowDependencyTaskList] = useState(false);
   - Add button in demo-controls div with same styling as main demo
   - Pass showTaskList={showDependencyTaskList} to GanttChart

3. For Cascade demo section (around line 764):
   - Add: const [showCascadeTaskList, setShowCascadeTaskList] = useState(false);
   - Add button in demo-controls div
   - Pass showTaskList={showCascadeTaskList} to GanttChart

4. For Chain 100 demo section (around line 783):
   - Add: const [showChain100TaskList, setShowChain100TaskList] = useState(false);
   - Add button in demo-controls div
   - Pass showTaskList={showChain100TaskList} to GanttChart

5. For Expired Tasks demo section (around line 802):
   - Add: const [showExpiredTaskList, setShowExpiredTaskList] = useState(false);
   - Add button in demo-controls div
   - Pass showTaskList={showExpiredTaskList} to GanttChart

Button styling should match existing pattern:
```tsx
<button
  className={`demo-btn ${showTaskList ? "demo-btn-danger" : "demo-btn-primary"}`}
  onClick={() => setShowTaskList(!showTaskList)}
>
  {showTaskList ? "Hide Task List" : "Show Task List"}
</button>
```

Default all new sections to showTaskList={false} (hidden by default) to keep existing layout clean.
</action>
  <verify>
    <automated>grep -c "showTaskList" packages/website/src/app/page.tsx | grep -q "10"</automated>
  </verify>
  <done>Each of the 5 demo sections has its own independent show/hide task list button</done>
</task>

<task type="auto">
  <name>Task 2: Add show/hide task list button to MCP page</name>
  <files>packages/website/src/app/mcp/page.tsx</files>
  <action>
Add show/hide task list functionality to the MCP demo page:

1. Add state variable after existing useState declarations (around line 7):
   const [showTaskList, setShowTaskList] = useState(false);

2. Add a button above the GanttChart div (after the paragraph, around line 58):
   ```tsx
   <button
     onClick={() => setShowTaskList(!showTaskList)}
     style={{
       padding: "0.5rem 1rem",
       backgroundColor: showTaskList ? "#ef4444" : "#3b82f6",
       color: "white",
       border: "none",
       borderRadius: "4px",
       cursor: "pointer",
       marginBottom: "1rem",
     }}
   >
     {showTaskList ? "Hide Task List" : "Show Task List"}
   </button>
   ```

3. Pass showTaskList prop to GanttChart (around line 67):
   <GanttChart
     tasks={tasks}
     dayWidth={24}
     rowHeight={36}
     onChange={handleChange}
     showTaskList={showTaskList}
   />

Default to false (hidden) to match other secondary demos.
</action>
  <verify>
    <automated>grep -c "showTaskList" packages/website/src/app/mcp/page.tsx | grep -q "3"</automated>
  </verify>
  <done>MCP page has a functional show/hide task list button</done>
</task>

</tasks>

<verification>
Overall verification:
1. All demo sections have independent show/hide task list buttons
2. Buttons toggle between "Show Task List" and "Hide Task List" text
3. Each chart's task list can be toggled independently
4. No cross-section interference (each has its own state)
</verification>

<success_criteria>
- Main page has 5 independent show/hide task list controls (one per demo section)
- MCP page has 1 show/hide task list control
- All buttons work independently without affecting other sections
- Default state: main demo shows task list, all others hide it
</success_criteria>

<output>
After completion, create `.planning/quick/087-show-hide-tasklist-button/087-SUMMARY.md`
</output>

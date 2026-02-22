---
phase: quick-023
plan: 23
type: execute
wave: 1
depends_on: []
files_modified: [packages/gantt-lib/README.md]
autonomous: true
requirements: [DOC-001]
user_setup: []
must_haves:
  truths:
    - "README documents the Task.dependencies field with TaskDependency interface"
    - "README explains all 4 link types: FS, SS, FF, SF"
    - "README documents cascade/auto-scheduling props: enableAutoSchedule, onCascade"
    - "README documents constraint enforcement: disableConstraints, onValidateDependencies"
    - "README includes code example showing dependencies usage"
  artifacts:
    - path: "packages/gantt-lib/README.md"
      provides: "Library documentation"
      contains: "dependencies"
      contains: "TaskDependency"
      contains: "enableAutoSchedule"
      contains: "onCascade"
      contains: "disableConstraints"
      contains: "onValidateDependencies"
  key_links:
    - from: "README.md Task interface documentation"
      to: "src/types/index.ts Task interface"
      via: "Type definitions"
      pattern: "dependencies\\?: TaskDependency\\[\\]"
---

<objective>
Update README.md to document recently added dependency features

Purpose: The library now supports task dependencies (FS/SS/FF/SF link types), cascade scheduling, and constraint enforcement, but these features are not documented in the README. Users need comprehensive documentation to use these features.

Output: Updated README.md with full dependency system documentation including code examples
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/gantt-lib/README.md
@packages/gantt-lib/src/types/index.ts
@packages/gantt-lib/src/components/GanttChart/GanttChart.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add dependency system documentation to README</name>
  <files>packages/gantt-lib/README.md</files>
  <action>
    Add a new "Dependencies" section after the Task interface documentation that includes:

    1. **Overview**: Brief explanation of task dependencies (predecessor-successor relationships)

    2. **Link Types**: Document all 4 types with clear explanations:
       - FS (Finish-to-Start): Predecessor must finish before successor starts (most common)
       - SS (Start-to-Start): Predecessor and successor start simultaneously
       - FF (Finish-to-Finish): Predecessor and successor finish simultaneously
       - SF (Start-to-Finish): Predecessor must start before successor can finish

    3. **TaskDependency Interface**:
       ```typescript
       interface TaskDependency {
         taskId: string;      // ID of predecessor task
         type: 'FS' | 'SS' | 'FF' | 'SF';
         lag?: number;        // Days delay (positive or negative)
       }
       ```

    4. **Lag**: Explain positive (delay) and negative (overlap) lag values

    5. **Code Example**: Show tasks with dependencies:
       ```tsx
       const tasks: Task[] = [
         {
           id: "1",
           name: "Foundation",
           startDate: "2026-02-01",
           endDate: "2026-02-10",
         },
         {
           id: "2",
           name: "Construction",
           startDate: "2026-02-11",
           endDate: "2026-02-25",
           dependencies: [
             { taskId: "1", type: "FS" }  // Starts after Foundation finishes
           ],
         },
       ];
       ```

    Place this section between "Task" documentation and "Customization" sections.
  </action>
  <verify>Read packages/gantt-lib/README.md and confirm "Dependencies" section exists with all 4 link types documented</verify>
  <done>README has complete dependency system documentation with TaskDependency interface, all 4 link types, lag explanation, and code example</done>
</task>

<task type="auto">
  <name>Task 2: Add cascade scheduling and constraint props to GanttChart API</name>
  <files>packages/gantt-lib/README.md</files>
  <action>
    Update the GanttChart props table to include the new dependency-related props:

    Add these rows to the props table:

    | Prop | Type | Default | Description |
    |------|------|---------|-------------|
    | `dependencies` | `TaskDependency[]` | _undefined_ | Array of predecessor dependencies on the Task interface (see Dependencies section) |
    | `enableAutoSchedule` | `boolean` | `false` | Enable automatic shifting of dependent tasks when predecessor moves (cascade) |
    | `onCascade` | `(tasks: Task[]) => void` | _undefined_ | Callback when cascade drag completes; receives all shifted tasks including the dragged task |
    | `disableConstraints` | `boolean` | `false` | Disable dependency constraint checking during drag (allows violations during editing) |
    | `onValidateDependencies` | `(result: ValidationResult) => void` | _undefined_ | Callback for dependency validation results (cycles, missing tasks, constraint violations) |
    | `headerHeight` | `number` | `40` | Height of the header row in pixels |
    | `containerHeight` | `number` | `600` | Container height for vertical scrolling |

    Also add a brief "Cascade Scheduling" subsection after the Dependencies section explaining:
    - What cascade scheduling is (auto-shifting dependent tasks)
    - How enableAutoSchedule enables it
    - onCascade callback for notification
    - Mention hard mode (constraints enforced) vs soft mode (lag calculated)
  </action>
  <verify>Read packages/gantt-lib/README.md and confirm all new props are in the GanttChart props table</verify>
  <done>GanttChart props table includes enableAutoSchedule, onCascade, disableConstraints, onValidateDependencies, headerHeight, containerHeight with clear descriptions</done>
</task>

<task type="auto">
  <name>Task 3: Add comprehensive dependency example to README</name>
  <files>packages/gantt-lib/README.md</files>
  <action>
    Add a complete "Dependency Examples" section after the "Cascade Scheduling" section with practical examples:

    1. **Simple FS dependency**: Basic finish-to-start relationship
    2. **SS with negative lag**: Overlapping starts
    3. **Multiple dependencies**: Task waiting for multiple predecessors
    4. **Mixed link types**: Showing different relationship types

    Example format:
    ```tsx
    // Example: SS dependency with negative lag (overlap)
    {
      id: "plumbing",
      name: "Plumbing",
      startDate: "2026-02-10",
      endDate: "2026-02-20",
      dependencies: [
        { taskId: "framing", type: "SS", lag: -3 }  // Start 3 days before framing ends
      ],
    }
    ```

    Also add a "Dependency Validation" subsection explaining:
    - Cycles are detected and highlighted in red
    - ValidationResult interface
    - onValidateDependencies callback for custom error handling
  </action>
  <verify>Read packages/gantt-lib/README.md and confirm "Dependency Examples" section exists with multiple practical examples</verify>
  <done>README has comprehensive dependency examples section showing FS, SS with negative lag, multiple dependencies, and validation usage</done>
</task>

</tasks>

<verification>
- README documents Task.dependencies field with TaskDependency interface
- All 4 link types (FS, SS, FF, SF) are explained with use cases
- GanttChart props table includes: enableAutoSchedule, onCascade, disableConstraints, onValidateDependencies, headerHeight, containerHeight
- Code examples show practical dependency usage
- Dependency validation is documented
</verification>

<success_criteria>
User can read README and understand:
1. How to add dependencies to tasks
2. What each link type means and when to use it
3. How to enable cascade scheduling
4. How to handle dependency validation results
5. See practical code examples for common dependency scenarios
</success_criteria>

<output>
After completion, create `.planning/quick/23-readme-s/23-SUMMARY.md`
</output>

---
phase: quick
plan: 8
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/modal/page.tsx
  - src/app/modal/modal.css
  - src/components/Modal/Modal.tsx
  - src/components/Modal/Modal.module.css
  - src/components/index.ts
autonomous: false
requirements: []
must_haves:
  truths:
    - "User can visit /modal page and see a button to open modal"
    - "User can click button and modal appears with Gantt chart inside"
    - "Modal has overlay backdrop and can be closed"
    - "Gantt chart inside modal is fully functional (drag/resize works)"
  artifacts:
    - path: "src/app/modal/page.tsx"
      provides: "Modal demo page with open button"
      contains: "Modal component with GanttChart as child"
    - path: "src/components/Modal/Modal.tsx"
      provides: "Reusable modal component with overlay"
      exports: ["Modal"]
    - path: "src/components/Modal/Modal.module.css"
      provides: "Modal styling (overlay, container, animation)"
  key_links:
    - from: "src/app/modal/page.tsx"
      to: "src/components/Modal/Modal.tsx"
      via: "Modal import"
      pattern: "import.*Modal.*from.*Modal"
    - from: "src/components/Modal/Modal.tsx"
      to: "src/components/GanttChart"
      via: "children prop rendering"
      pattern: "children.*props"
---

<objective>
Create a new /modal page with a button that opens a modal window containing a Gantt chart.

Purpose: Demonstrate Gantt chart usage inside a modal container
Output: Working modal page at /modal route with interactive Gantt chart
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/GanttChart/GanttChart.tsx
@src/app/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Modal component</name>
  <files>src/components/Modal/Modal.tsx src/components/Modal/Modal.module.css src/components/index.ts</files>
  <action>
    Create a reusable Modal component with the following:

    1. Create src/components/Modal/Modal.tsx with:
       - Props: isOpen (boolean), onClose (function), children (ReactNode)
       - Fixed overlay with semi-transparent backdrop (rgba(0,0,0,0.5))
       - Centered modal container with max-width and scrolling
       - Close on backdrop click
       - ESC key handling
       - Portal rendering (using ReactDOM.createPortal)
       - CSS animation for fade-in/scale-up effect

    2. Create src/components/Modal/Modal.module.css with:
       - overlay: fixed inset-0, flex center, z-index 1000, backdrop blur
       - modal: bg-white rounded shadow-xl, max-w-4xl, max-h-90vh, overflow-auto
       - Animation keyframes for fade-in and scale-in
       - Close button styling (top-right X button)

    3. Add Modal export to src/components/index.ts

    Use CSS modules for styling (follows existing pattern).
  </action>
  <verify>
    1. test -f "src/components/Modal/Modal.tsx"
    2. test -f "src/components/Modal/Modal.module.css"
    3. grep "Modal" src/components/index.ts
  </verify>
  <done>Modal component exists with overlay, close behavior, and animation</done>
</task>

<task type="auto">
  <name>Task 2: Create /modal page with button and Gantt chart</name>
  <files>src/app/modal/page.tsx src/app/modal/modal.css</files>
  <action>
    Create a demo page at /modal route:

    1. Create src/app/modal/page.tsx with:
       - "use client" directive
       - useState for modal open/close state
       - Sample tasks array (3-4 tasks spanning different dates)
       - "Open Modal" button (styled, centered on page)
       - Modal component wrapping GanttChart
       - Page title and basic layout

    2. Create src/app/modal/modal.css with:
       - Page layout styles (centered content, min-h-screen)
       - Button styles (primary color, hover states, padding)
       - Container styling for the demo

    Page structure:
    ```tsx
    <div className={styles.page}>
      <h1>Modal Demo</h1>
      <p>Click the button to open a Gantt chart in a modal</p>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <GanttChart tasks={tasks} />
      </Modal>
    </div>
    ```
  </action>
  <verify>
    1. test -f "src/app/modal/page.tsx"
    2. test -f "src/app/modal/modal.css"
    3. grep -q "Modal" src/app/modal/page.tsx
    4. grep -q "GanttChart" src/app/modal/page.tsx
  </verify>
  <done>/modal page exists with button, modal, and Gantt chart inside</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Complete modal page with Gantt chart integration</what-built>
  <how-to-verify>
    1. Visit http://localhost:3000/modal
    2. Verify page loads with "Open Modal" button
    3. Click button - verify modal appears with smooth animation
    4. Verify modal has semi-transparent backdrop
    5. Verify Gantt chart is visible and functional inside modal
    6. Test drag/resize operations on task bars within modal
    7. Close modal by clicking backdrop, X button, or pressing ESC
    8. Re-open modal to verify state persistence
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
1. Visit /modal route and confirm page loads
2. Click "Open Modal" button and verify modal appears
3. Confirm Gantt chart renders inside modal
4. Test drag/resize functionality works within modal
5. Test all close methods (backdrop, X button, ESC key)
</verification>

<success_criteria>
- Modal page accessible at /modal route
- Modal opens with animation when button clicked
- Gantt chart renders and functions inside modal
- Modal closes via backdrop click, X button, or ESC key
- No layout issues or scroll problems
</success_criteria>

<output>
After completion, create `.planning/quick/8-modal/8-SUMMARY.md`
</output>

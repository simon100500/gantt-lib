---
status: resolved
trigger: "typing-first-char-selected"
created: 2026-03-09T00:00:00.000Z
updated: 2026-03-09T00:03:00.000Z
---

## Current Focus

hypothesis: CONFIRMED. The useEffect on `editingName` unconditionally called `input.select()` after focus. When a keydown handler set `editingName=true` with the typed char as `nameValue`, the effect fired and selected all text — the single char. Next keypress replaced it.
test: Code read confirmed exact mechanism. Fix applied.
expecting: Typing on a selected row now appends characters normally; double-click still selects all; auto-edit-on-insert still selects all.
next_action: Human verification of fix in browser.

## Symptoms

expected: Selecting a task and starting to type should open edit mode with the typed character already in the field, cursor at end. Continuing to type appends characters normally.
actual: First character is typed, but then becomes selected (highlighted). Second character replaces the first. "Кошка" → "ошка".
errors: No console errors.
reproduction: 1. Click to select any existing task row (not create new) 2. Start typing a character (e.g. "К") 3. "К" appears in the input but is selected/highlighted 4. Type "о" → "К" disappears, only "о" remains
started: Appeared AFTER the previous fix for the double-confirm issue (autoEditedForRef + task.name removed from useEffect deps).

## Eliminated

- hypothesis: task.name being set then select() causes the issue at the auto-edit-on-insert path
  evidence: auto-edit-on-insert sets nameValue=task.name then setEditingName(true), and calls select() — this is intentional/correct for that path
  timestamp: 2026-03-09T00:00:00.000Z

## Evidence

- timestamp: 2026-03-09T00:00:00.000Z
  checked: handleRowKeyDown (line 305-313)
  found: Sets nameValue=e.key (the typed character), then setEditingName(true). Does NOT call select().
  implication: nameValue is correctly set to just the first char.

- timestamp: 2026-03-09T00:00:00.000Z
  checked: useEffect on editingName (line 266-271)
  found: Unconditionally calls nameInputRef.current.focus() AND nameInputRef.current.select() whenever editingName becomes true.
  implication: After keydown sets editingName=true, this effect fires and selects ALL text in the input — which is just the single typed char. Next keypress replaces it.

- timestamp: 2026-03-09T00:00:00.000Z
  checked: handleNameDoubleClick (line 298-303)
  found: Sets nameValue=task.name then setEditingName(true). Here, calling select() IS desirable — selects existing name for replacement.
  implication: select() must be conditional on HOW editing was triggered.

## Resolution

root_cause: The useEffect that fires on `editingName=true` always called `input.select()`. This is correct for double-click and auto-edit-on-insert (user wants to replace the whole name). But when triggered by a keypress, `nameValue` is already set to just the first typed character, and select() highlights it entirely — causing the second keypress to overwrite it.

fix: Added `editTriggerRef` (ref of type 'keypress' | 'doubleclick' | 'autoedit'). Each of the three code paths that set `setEditingName(true)` now also sets `editTriggerRef.current`. The useEffect checks the ref: for 'keypress' it places the cursor at end (setSelectionRange(len, len)); for 'doubleclick' and 'autoedit' it still calls select().

verification: TypeScript type check passes (pre-existing errors in test files unrelated to this change). Human confirmed all three scenarios work correctly in browser: (1) type on selected row → chars accumulate normally, (2) double-click → existing name selected for replacement, (3) insert new task → name field selected for replacement.

files_changed:
  - packages/gantt-lib/src/components/TaskList/TaskListRow.tsx

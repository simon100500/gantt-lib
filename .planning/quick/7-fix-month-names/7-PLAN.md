---
phase: quick
plan: 7
type: execute
wave: 1
depends_on: []
files_modified: [src/components/TimeScaleHeader/TimeScaleHeader.tsx]
autonomous: false
requirements: []
user_setup: []

must_haves:
  truths:
    - "Month names displayed in Russian with capital first letter"
    - "Month names in nominative case (именительный падеж)"
    - "Examples: Январь, Февраль, Март, Апрель, Май, Июнь, Июль, Август, Сентябрь, Октябрь, Ноябрь, Декабрь"
  artifacts:
    - path: "src/components/TimeScaleHeader/TimeScaleHeader.tsx"
      provides: "Month name formatting in header"
      min_lines: 80
  key_links:
    - from: "src/components/TimeScaleHeader/TimeScaleHeader.tsx"
      to: "date-fns format"
      via: "month formatting call"
      pattern: "format.*MMMM"
---

<objective>
Fix month names in TimeScaleHeader to use nominative case (именительный падеж) with capital first letter

Purpose: The current implementation uses 'MMMM' format with Russian locale which produces genitive case with lowercase (e.g., "февраля", "марта"). This is grammatically incorrect for standalone month labels - Russian month names should be in nominative case ("Февраль", "Март") when displayed as headers.

Output: Updated TimeScaleHeader component displaying Russian month names correctly
</objective>

<execution_context>
@C:/Users/Volobuev/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Volobuev/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/TimeScaleHeader/TimeScaleHeader.tsx
</context>

<tasks>

<task type="auto">
  <name>Fix month names to nominative case with capital letter</name>
  <files>src/components/TimeScaleHeader/TimeScaleHeader.tsx</files>
  <action>
    Replace the date-fns format pattern from 'MMMM' to 'LLLL' which is the stand-alone month name format in date-fns. The 'LLLL' format produces nominative case month names instead of genitive case.

    Change line 58 from:
      {format(span.month, 'MMMM', { locale: ru })}

    To:
      {format(span.month, 'LLLL', { locale: ru })}

    The 'LLLL' format specifically outputs the stand-alone (nominative) form of month names, while 'MMMM' outputs the formatted form (genitive in Russian). The 'LLLL' format also capitalizes the first letter.

    Reference: date-fns documentation - 'LLLL' is for "stand-alone month name" vs 'MMMM' for "month name (formatting-related)".
  </action>
  <verify>Visual check - month names should appear as "Январь", "Февраль", "Март" etc. with capital first letter</verify>
  <done>Month names display in nominative case (именительный падеж) with capital first letter</done>
</task>

</tasks>

<verification>
After change, verify that:
1. Month names start with capital letter (Январь, Февраль, etc.)
2. Month names are in nominative case (not genitive like "февраля")
3. All 12 months display correctly
</verification>

<success_criteria>
- Month names display in Russian with capital first letter
- Month names are in nominative case (именительный падеж)
- No changes to component behavior other than formatting
</success_criteria>

<output>
After completion, create `.planning/quick/7-fix-month-names/7-SUMMARY.md`
</output>

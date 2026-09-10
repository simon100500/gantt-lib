// FILE: packages/gantt-lib/src/__tests__/print-layout-contract.test.ts
// VERSION: 1.0.0
// START_MODULE_CONTRACT
//   PURPOSE: Lock the print-layout contract for exact-range Gantt rendering.
//   SCOPE: Verify that print CSS preserves task-area height and reapplies exact-range clipping.
//   INPUTS: The checked-in GanttChart.css print rules.
//   OUTPUTS: Regression protection against collapsed grids and task bars in PDF output.
// END_MODULE_CONTRACT
//
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync(new URL('../components/GanttChart/GanttChart.css', import.meta.url), 'utf8');

describe('GanttChart print layout', () => {
  it('keeps exact-range task-area geometry measurable in print', () => {
    const printBlock = stylesheet.match(/@media print\s*\{([\s\S]*)\}\s*$/)?.[1] ?? '';

    expect(printBlock).toContain('.gantt-taskArea {');
    expect(printBlock).toContain('max-height: none !important;');
    expect(printBlock).not.toMatch(/\.gantt-taskArea\s*\{[^}]*height:\s*auto\s*!important/s);
    expect(printBlock).toContain('.gantt-taskArea.gantt-taskArea-clipped {');
    expect(printBlock).toContain('overflow: hidden !important;');
  });
});

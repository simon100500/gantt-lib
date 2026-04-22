import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertHeavyDataTaskIntegrity,
  createHeavyDataFixture,
  createHeavyDataTasks,
  getHeavyDataCollapsedParentIds,
  getHeavyDataTaskCounts,
  getHeavyDataVisibleRowCount,
  heavyDataExactRowCounts,
  heavyDataTierOrder,
} from '../stories/fixtures/createHeavyDataTasks';
import {
  heavyDataCatalog,
  heavyDataReviewSurfaceStrings,
  heavyDataSections,
  heavyDataStoryTitles,
} from '../stories/heavy-data/catalog';

const packageRoot = resolve(import.meta.dirname, '../..');

describe('heavy data catalog contract', () => {
  it('keeps preview storySort aligned with the dedicated Heavy data section order', () => {
    const previewContents = readFileSync(
      resolve(packageRoot, '.storybook', 'preview.ts'),
      'utf8',
    );

    expect(previewContents).toContain("'Examples'");
    expect(previewContents).toContain("'Heavy data'");
    expect(previewContents).toContain('heavyDataSections');
    expect(previewContents.indexOf("'Heavy data'"))
      .toBeGreaterThan(previewContents.indexOf("'Examples'"));

    expect(heavyDataSections).toEqual(['~100 rows', '~500 rows', '~1000 rows']);
  });

  it('declares the heavy-data story namespace and expected story files before authoring', () => {
    expect(heavyDataCatalog).toHaveLength(heavyDataSections.length);
    expect(heavyDataStoryTitles).toEqual([
      'Heavy data/~100 rows',
      'Heavy data/~500 rows',
      'Heavy data/~1000 rows',
    ]);

    for (const entry of heavyDataCatalog) {
      const storyPath = resolve(packageRoot, 'src', 'stories', 'heavy-data', entry.storyFile);
      expect(
        existsSync(storyPath),
        `Expected heavy-data story file ${entry.storyFile} to exist.`,
      ).toBe(false);
      expect(entry.title.startsWith('Heavy data/')).toBe(true);
    }
  });

  it('builds deterministic around-100, around-500, and around-1000 datasets with valid shape', () => {
    expect(heavyDataTierOrder).toEqual(['around-100', 'around-500', 'around-1000']);
    expect(heavyDataExactRowCounts).toEqual([102, 510, 1020]);

    const firstPass = heavyDataTierOrder.map((tier) => createHeavyDataFixture(tier));
    const secondPass = heavyDataTierOrder.map((tier) => createHeavyDataFixture(tier));

    expect(secondPass).toEqual(firstPass);

    for (const fixture of firstPass) {
      expect(fixture.tasks).toHaveLength(fixture.exactRowCount);
      expect(fixture.initiallyCollapsedParentIds).toEqual(
        getHeavyDataCollapsedParentIds(fixture.tier),
      );
      expect(fixture.reviewNotes.length).toBeGreaterThan(0);
      expect(fixture.tasks.some((task) => task.id === fixture.focusTaskId)).toBe(true);

      const counts = getHeavyDataTaskCounts(fixture.tasks);
      const visibleRows = getHeavyDataVisibleRowCount(
        fixture.tasks,
        fixture.initiallyCollapsedParentIds,
      );

      expect(counts.totalRows).toBe(fixture.exactRowCount);
      expect(counts.groupRows).toBeGreaterThan(0);
      expect(counts.milestoneRows).toBeGreaterThan(0);
      expect(visibleRows).toBeLessThan(counts.totalRows);
      expect(visibleRows).toBeGreaterThan(counts.groupRows);

      assertHeavyDataTaskIntegrity(fixture.tasks);
    }
  });

  it('rejects unsupported tiers, zero-row fixtures, missing parent linkage, and duplicate ids', () => {
    expect(() => createHeavyDataTasks('unsupported-tier')).toThrow(
      /Unsupported heavy data density tier/,
    );
    expect(() => assertHeavyDataTaskIntegrity([])).toThrow(/at least one row/);
    expect(() =>
      assertHeavyDataTaskIntegrity([
        {
          id: 'orphan',
          parentId: 'missing-parent',
          name: 'Orphan row',
          startDate: '2026-05-01',
          endDate: '2026-05-02',
          progress: 0,
        },
      ]),
    ).toThrow(/missing parent link/);
    expect(() =>
      assertHeavyDataTaskIntegrity([
        {
          id: 'dup',
          name: 'First',
          startDate: '2026-05-01',
          endDate: '2026-05-02',
          progress: 0,
        },
        {
          id: 'dup',
          name: 'Second',
          startDate: '2026-05-01',
          endDate: '2026-05-02',
          progress: 0,
        },
      ]),
    ).toThrow(/duplicate task id/);
  });

  it('locks the review harness diagnostics strings and package-local public-boundary composition', () => {
    const harnessContents = readFileSync(
      resolve(packageRoot, 'src', 'stories', 'heavy-data', 'HeavyDataReviewHarness.tsx'),
      'utf8',
    );

    expect(harnessContents).toContain('CapabilityStoryHarness');
    expect(harnessContents).not.toMatch(/packages[\\/]website/);
    expect(harnessContents).not.toMatch(/gantt-lib\/src\//);
    expect(harnessContents).not.toMatch(/from\s+['"]@\//);

    for (const label of heavyDataReviewSurfaceStrings) {
      expect(harnessContents).toContain(label);
    }

    expect(harnessContents).toContain('Expected row count');
    expect(harnessContents).toContain('Focused review task');
    expect(harnessContents).toContain('Last event');
  });
});

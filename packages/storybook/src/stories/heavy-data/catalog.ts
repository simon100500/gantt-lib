export const heavyDataSections = ['~100 rows', '~500 rows', '~1000 rows'] as const;

export type HeavyDataSection = (typeof heavyDataSections)[number];

export interface HeavyDataCatalogEntry {
  section: HeavyDataSection;
  storyFile: string;
  title: `Heavy data/${HeavyDataSection}`;
  tier: 'around-100' | 'around-500' | 'around-1000';
}

export const heavyDataCatalog: HeavyDataCatalogEntry[] = [
  {
    section: '~100 rows',
    storyFile: 'Review100Rows.stories.tsx',
    title: 'Heavy data/~100 rows',
    tier: 'around-100',
  },
  {
    section: '~500 rows',
    storyFile: 'Review500Rows.stories.tsx',
    title: 'Heavy data/~500 rows',
    tier: 'around-500',
  },
  {
    section: '~1000 rows',
    storyFile: 'Review1000Rows.stories.tsx',
    title: 'Heavy data/~1000 rows',
    tier: 'around-1000',
  },
] as const;

export const heavyDataStoryTitles = heavyDataCatalog.map((entry) => entry.title);
export const heavyDataReviewSurfaceStrings = [
  'Density tier',
  'Total rows',
  'Visible rows',
  'Collapsed groups',
  'Rendered task totals',
  'Review focus',
  'Review notes',
] as const;

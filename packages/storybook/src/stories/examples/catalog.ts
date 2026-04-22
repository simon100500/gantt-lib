export const exampleSections = [
  'Program workspace',
  'Search and highlight',
  'Dependency control center',
] as const;

export type ExampleSection = (typeof exampleSections)[number];

export interface ExampleCatalogEntry {
  section: ExampleSection;
  storyFile: string;
  title: `Examples/${ExampleSection}`;
}

export const exampleCatalog: ExampleCatalogEntry[] = [
  {
    section: 'Program workspace',
    storyFile: 'ProgramWorkspace.stories.tsx',
    title: 'Examples/Program workspace',
  },
  {
    section: 'Search and highlight',
    storyFile: 'SearchAndHighlight.stories.tsx',
    title: 'Examples/Search and highlight',
  },
  {
    section: 'Dependency control center',
    storyFile: 'DependencyControlCenter.stories.tsx',
    title: 'Examples/Dependency control center',
  },
] as const;

export const exampleStoryTitles = exampleCatalog.map((entry) => entry.title);

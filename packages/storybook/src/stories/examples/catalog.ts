export const exampleSections = [
  'Management overview',
  'Searchable triage',
  'Extension workspace',
  'Operations review',
] as const;

export type ExampleSection = (typeof exampleSections)[number];

export interface ExampleCatalogEntry {
  section: ExampleSection;
  storyFile: string;
  title: `Examples/${ExampleSection}`;
}

export const exampleCatalog: ExampleCatalogEntry[] = [
  {
    section: 'Management overview',
    storyFile: 'ManagementOverview.stories.tsx',
    title: 'Examples/Management overview',
  },
  {
    section: 'Searchable triage',
    storyFile: 'SearchableTriage.stories.tsx',
    title: 'Examples/Searchable triage',
  },
  {
    section: 'Extension workspace',
    storyFile: 'ExtensionWorkspace.stories.tsx',
    title: 'Examples/Extension workspace',
  },
  {
    section: 'Operations review',
    storyFile: 'OperationsReview.stories.tsx',
    title: 'Examples/Operations review',
  },
] as const;

export const exampleStoryTitles = exampleCatalog.map((entry) => entry.title);

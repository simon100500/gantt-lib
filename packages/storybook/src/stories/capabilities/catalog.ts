export const capabilitySections = [
  'Layout',
  'Task states',
  'Interaction',
  'Dependencies',
  'Filtering',
  'Extensions',
  'Imperative controls',
] as const;

export type CapabilitySection = (typeof capabilitySections)[number];

export interface CapabilityCatalogEntry {
  section: CapabilitySection;
  storyFile: string;
  title: `Capabilities/${CapabilitySection}`;
}

export const capabilityCatalog: CapabilityCatalogEntry[] = [
  {
    section: 'Layout',
    storyFile: 'Layout.stories.tsx',
    title: 'Capabilities/Layout',
  },
  {
    section: 'Task states',
    storyFile: 'TaskStates.stories.tsx',
    title: 'Capabilities/Task states',
  },
  {
    section: 'Interaction',
    storyFile: 'Interaction.stories.tsx',
    title: 'Capabilities/Interaction',
  },
  {
    section: 'Dependencies',
    storyFile: 'Dependencies.stories.tsx',
    title: 'Capabilities/Dependencies',
  },
  {
    section: 'Filtering',
    storyFile: 'Filtering.stories.tsx',
    title: 'Capabilities/Filtering',
  },
  {
    section: 'Extensions',
    storyFile: 'Extensions.stories.tsx',
    title: 'Capabilities/Extensions',
  },
  {
    section: 'Imperative controls',
    storyFile: 'ImperativeControls.stories.tsx',
    title: 'Capabilities/Imperative controls',
  },
] as const;

export const capabilityStoryTitles = capabilityCatalog.map((entry) => entry.title);

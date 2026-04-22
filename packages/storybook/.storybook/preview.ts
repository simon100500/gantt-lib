import type { Preview } from '@storybook/react';
import 'gantt-lib/styles.css';
import '../src/preview.css';
import { capabilitySections } from '../src/stories/capabilities/catalog';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ['Overview', '*', ['Scaffold', 'Workspace Smoke Test'], 'Capabilities', [...capabilitySections]],
      },
    },
  },
};

export default preview;

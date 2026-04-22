import { dirname } from 'node:path';
import { createRequire } from 'node:module';
import type { StorybookConfig } from '@storybook/react-vite';

const require = createRequire(import.meta.url);
const reactVitePackageDir = dirname(
  require.resolve('@storybook/react-vite/package.json'),
);

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: reactVitePackageDir,
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
};

export default config;

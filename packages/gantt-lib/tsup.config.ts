import { defineConfig } from 'tsup';
import preserveDirectives from 'esbuild-plugin-preserve-directives';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', 'date-fns'],
  esbuildPlugins: [
    preserveDirectives({
      directives: ['use client', 'use strict'],
      include: /\.(js|ts|jsx|tsx)$/,
    }),
  ],
  onSuccess: async () => {
    const fs = await import('fs');
    const path = await import('path');
    const distDir = path.join(process.cwd(), 'dist');
    const cssFiles = fs.readdirSync(distDir).filter((f: string) => f.endsWith('.css') && f !== 'styles.css');
    if (cssFiles.length > 0) {
      fs.renameSync(path.join(distDir, cssFiles[0]), path.join(distDir, 'styles.css'));
    }
  },
});

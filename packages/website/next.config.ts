import path from 'node:path';
import type { NextConfig } from 'next';

// Исходники gantt-lib (воркспейс). Пакет собирается в dist, но для HMR в dev
// компилируем именно исходники: правки библиотеки подхватываются сразу, без
// пересборки dist и перезагрузки страницы.
const libSrc = path.resolve(__dirname, '../gantt-lib/src');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['gantt-lib'],
  webpack: (config, { dev }) => {
    if (dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Точное совпадение: barrel и глобальный CSS берём из src (тот же файл,
        // что импортит index.ts, поэтому дубля стилей нет).
        'gantt-lib$': path.join(libSrc, 'index.ts'),
        'gantt-lib/styles.css$': path.join(libSrc, 'styles.css'),
      };
    }
    return config;
  },
};

export default nextConfig;

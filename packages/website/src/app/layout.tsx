import type { Metadata } from 'next';
import 'gantt-lib/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gantt Chart Demo',
  description: 'gantt-lib demo site',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

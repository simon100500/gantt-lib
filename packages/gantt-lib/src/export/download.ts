import type { Task } from '../components/GanttChart/GanttChart';
import { renderGanttToSvg, type GanttSvgExportOptions } from './svg';

export interface DownloadGanttSvgOptions<TTask extends Task = Task> extends GanttSvgExportOptions<TTask> {
  fileName?: string;
}

export function downloadSvgString(svgMarkup: string, fileName: string = 'gantt-chart.svg'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName.endsWith('.svg') ? fileName : `${fileName}.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);
}

export function downloadGanttSvg<TTask extends Task = Task>(tasks: TTask[], options?: DownloadGanttSvgOptions<TTask>): void {
  const svgMarkup = renderGanttToSvg(tasks, options);
  downloadSvgString(svgMarkup, options?.fileName);
}

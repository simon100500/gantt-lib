import type { ExportToPdfOptions } from './GanttChart';

interface PrintGanttChartParams {
  sourceDocument: Document;
  sourceContainer: HTMLElement;
  printContent: HTMLElement;
  title?: ExportToPdfOptions['title'];
  fileName?: ExportToPdfOptions['fileName'];
  orientation: NonNullable<ExportToPdfOptions['orientation']>;
}

function getPrintDocumentTitle({ title, fileName }: Pick<PrintGanttChartParams, 'title' | 'fileName'>): string {
  return title || fileName || 'Gantt chart';
}

function copyGanttCssVariables(sourceElement: HTMLElement, targetElement: HTMLElement) {
  const computedStyle = window.getComputedStyle(sourceElement);
  for (const propertyName of Array.from(computedStyle)) {
    if (!propertyName.startsWith('--gantt-')) continue;
    const value = computedStyle.getPropertyValue(propertyName);
    if (value) {
      targetElement.style.setProperty(propertyName, value);
    }
  }
}

async function copyDocumentStyles(sourceDocument: Document, targetDocument: Document) {
  const headNodes = Array.from(
    sourceDocument.querySelectorAll('style, link[rel="stylesheet"]')
  );

  const pendingLoads = headNodes.map(node => new Promise<void>((resolve) => {
    if (node instanceof HTMLStyleElement) {
      const style = targetDocument.createElement('style');
      style.textContent = node.textContent;
      targetDocument.head.appendChild(style);
      resolve();
      return;
    }

    if (node instanceof HTMLLinkElement && node.href) {
      const link = targetDocument.createElement('link');
      link.rel = 'stylesheet';
      link.href = node.href;
      if (node.media) {
        link.media = node.media;
      }
      link.onload = () => resolve();
      link.onerror = () => resolve();
      targetDocument.head.appendChild(link);
      return;
    }

    resolve();
  }));

  await Promise.all(pendingLoads);
}

function createPrintStyle(targetDocument: Document, orientation: PrintGanttChartParams['orientation']) {
  const style = targetDocument.createElement('style');
  style.textContent = `
    @page {
      size: ${orientation};
      margin: 12mm;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    body {
      color: #111827;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .gantt-print-root,
    .gantt-print-root * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      box-sizing: border-box;
    }

    .gantt-print-root {
      padding: 16px 20px 24px;
      width: max-content;
      min-width: 100%;
    }

    .gantt-print-title {
      margin: 0 0 16px;
      font-size: 20px;
      font-weight: 600;
      line-height: 1.2;
      color: #111827;
    }

    .gantt-print-root .gantt-container,
    .gantt-print-root .gantt-scrollContainer,
    .gantt-print-root .gantt-scrollContent,
    .gantt-print-root .gantt-chartSurface,
    .gantt-print-root .gantt-taskArea {
      overflow: visible !important;
      height: auto !important;
      max-height: none !important;
    }

    .gantt-print-root .gantt-container {
      width: max-content;
      min-width: 100%;
      border-radius: 0;
    }

    .gantt-print-root .gantt-scrollContainer {
      cursor: default !important;
    }

    .gantt-print-root .gantt-stickyHeader,
    .gantt-print-root .gantt-tl-header {
      position: static !important;
      top: auto !important;
    }

    .gantt-print-root .gantt-tl-overlay {
      left: auto !important;
    }

    .gantt-print-root .gantt-tl-overlay-shadowed,
    .gantt-print-root .gantt-tl-row:hover,
    .gantt-print-root .gantt-tr-row:hover,
    .gantt-print-root .gantt-tr-taskBar:hover {
      box-shadow: none !important;
    }

    .gantt-print-root .gantt-tl-drag-handle,
    .gantt-print-root .gantt-tl-collapse-btn,
    .gantt-print-root .gantt-tl-add-btn,
    .gantt-print-root .gantt-tl-name-actions,
    .gantt-print-root .gantt-tl-context-menu,
    .gantt-print-root .gantt-tl-dep-add,
    .gantt-print-root .gantt-tl-dep-delete-label,
    .gantt-print-root .gantt-tl-dep-source-picker,
    .gantt-print-root .gantt-tl-dep-type-menu,
    .gantt-print-root .gantt-tl-dep-type-trigger,
    .gantt-print-root .gantt-tl-number-steppers,
    .gantt-print-root .gantt-tr-resizeHandle,
    .gantt-print-root .gantt-tr-leftLabels {
      display: none !important;
    }
  `;
  targetDocument.head.appendChild(style);
}

function waitForNextPaint(printWindow: Window): Promise<void> {
  return new Promise(resolve => {
    if (typeof printWindow.requestAnimationFrame === 'function') {
      printWindow.requestAnimationFrame(() => {
        printWindow.requestAnimationFrame(() => resolve());
      });
      return;
    }
    printWindow.setTimeout(() => resolve(), 50);
  });
}

function createPrintFrame(sourceDocument: Document): HTMLIFrameElement {
  const iframe = sourceDocument.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  sourceDocument.body.appendChild(iframe);
  return iframe;
}

export async function printGanttChart({
  sourceDocument,
  sourceContainer,
  printContent,
  title,
  fileName,
  orientation,
}: PrintGanttChartParams): Promise<void> {
  const iframe = createPrintFrame(sourceDocument);

  try {
    const printWindow = iframe.contentWindow;
    const printDocument = iframe.contentDocument;

    if (!printWindow || !printDocument) {
      throw new Error('Unable to create print frame');
    }

    const printTitle = getPrintDocumentTitle({ title, fileName });

    printDocument.open();
    printDocument.write('<!doctype html><html><head><meta charset="utf-8" /></head><body></body></html>');
    printDocument.close();
    printDocument.title = printTitle;

    await copyDocumentStyles(sourceDocument, printDocument);
    createPrintStyle(printDocument, orientation);

    const root = printDocument.createElement('div');
    root.className = 'gantt-print-root';
    copyGanttCssVariables(sourceContainer, root);

    const heading = printDocument.createElement('h1');
    heading.className = 'gantt-print-title';
    heading.textContent = printTitle;
    root.appendChild(heading);
    root.appendChild(printContent);
    printDocument.body.appendChild(root);

    await waitForNextPaint(printWindow);
    printWindow.focus();
    printWindow.print();
  } finally {
    window.setTimeout(() => {
      iframe.remove();
    }, 1000);
  }
}

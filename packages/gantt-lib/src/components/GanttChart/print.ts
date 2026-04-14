import type { ExportToPdfHeaderOptions, ExportToPdfOptions } from './GanttChart';

interface PrintGanttChartParams {
  sourceDocument: Document;
  printMarkup: string;
  header?: ExportToPdfHeaderOptions;
  title?: ExportToPdfOptions['title'];
  fileName?: ExportToPdfOptions['fileName'];
  orientation: NonNullable<ExportToPdfOptions['orientation']>;
}

function getPrintDocumentTitle({ header, title, fileName }: Pick<PrintGanttChartParams, 'header' | 'title' | 'fileName'>): string {
  return header?.projectName || title || header?.serviceName || fileName || 'Gantt chart';
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
    }

    .gantt-print-root svg {
      display: block;
      max-width: 100%;
      height: auto;
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
  printMarkup,
  header,
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

    const printTitle = getPrintDocumentTitle({ header, title, fileName });

    printDocument.open();
    printDocument.write('<!doctype html><html><head><meta charset="utf-8" /></head><body></body></html>');
    printDocument.close();
    printDocument.title = printTitle;

    createPrintStyle(printDocument, orientation);

    const root = printDocument.createElement('div');
    root.className = 'gantt-print-root';
    root.innerHTML = printMarkup;
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

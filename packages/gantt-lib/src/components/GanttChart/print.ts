import type { ExportToPdfHeaderOptions, ExportToPdfOptions } from './GanttChart';

interface PrintGanttChartParams {
  sourceDocument: Document;
  sourceContainer: HTMLElement;
  printContent: HTMLElement;
  header?: ExportToPdfHeaderOptions;
  title?: ExportToPdfOptions['title'];
  fileName?: ExportToPdfOptions['fileName'];
  orientation?: ExportToPdfOptions['orientation'];
}

function getPrintDocumentTitle({ header, title, fileName }: Pick<PrintGanttChartParams, 'header' | 'title' | 'fileName'>): string {
  return header?.projectName || title || header?.serviceName || fileName || 'Gantt chart';
}

function formatHeaderExportDate(exportDate?: ExportToPdfHeaderOptions['exportDate']): string | null {
  if (!exportDate) return null;
  if (typeof exportDate === 'string') return exportDate;

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(exportDate);
}

function createPrintHeader(
  targetDocument: Document,
  title: string,
  header?: ExportToPdfHeaderOptions
): HTMLDivElement {
  const headerElement = targetDocument.createElement('div');
  headerElement.className = 'gantt-print-header';

  if (header?.logoUrl) {
    const logoParent = targetDocument.createElement('span');
    logoParent.className = 'gantt-print-linkWrap';
    const logo = targetDocument.createElement('img');
    logo.className = 'gantt-print-logo';
    logo.src = header.logoUrl;
    logo.alt = header.serviceName || title;
    logoParent.appendChild(logo);
    if (header.logoHref) {
      const logoLink = targetDocument.createElement('a');
      logoLink.href = header.logoHref;
      logoLink.target = '_blank';
      logoLink.rel = 'noopener noreferrer';
      logoLink.className = 'gantt-print-linkOverlay';
      logoLink.setAttribute('aria-label', header.serviceName || title);
      logoParent.appendChild(logoLink);
    }
    headerElement.appendChild(logoParent);
  }

  const serviceName = header?.serviceName;
  if (serviceName) {
    const service = targetDocument.createElement('span');
    service.className = header?.serviceHref
      ? 'gantt-print-serviceName gantt-print-linkWrap'
      : 'gantt-print-serviceName';
    if (header.serviceHref) {
      const serviceText = targetDocument.createElement('span');
      serviceText.textContent = serviceName;
      service.appendChild(serviceText);

      const serviceLink = targetDocument.createElement('a');
      serviceLink.href = header.serviceHref;
      serviceLink.target = '_blank';
      serviceLink.rel = 'noopener noreferrer';
      serviceLink.className = 'gantt-print-linkOverlay';
      serviceLink.setAttribute('aria-label', serviceName);
      service.appendChild(serviceLink);
    } else {
      service.textContent = serviceName;
    }
    headerElement.appendChild(service);

    const separator = targetDocument.createElement('span');
    separator.className = 'gantt-print-separator';
    separator.textContent = '/';
    headerElement.appendChild(separator);
  }

  const project = targetDocument.createElement('span');
  project.className = 'gantt-print-projectName';
  project.textContent = header?.projectName || title;
  headerElement.appendChild(project);

  const exportDate = formatHeaderExportDate(header?.exportDate);
  if (exportDate) {
    const date = targetDocument.createElement('span');
    date.className = 'gantt-print-headerDate';
    date.textContent = exportDate;
    headerElement.appendChild(date);
  }

  return headerElement;
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

function createPrintStyle(targetDocument: Document, orientation?: PrintGanttChartParams['orientation']) {
  const style = targetDocument.createElement('style');
  style.textContent = `
    @page {
      ${orientation ? `size: ${orientation};` : ''}
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

    .gantt-print-header {
      display: flex;
      align-items: center;
      gap: 18px;
      margin: 0 0 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
      white-space: nowrap;
      overflow: hidden;
    }

    .gantt-print-logo {
      width: 32px;
      height: 32px;
      object-fit: contain;
      flex: 0 0 auto;
    }

    .gantt-print-linkWrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      flex: 0 0 auto;
    }

    .gantt-print-linkOverlay,
    .gantt-print-linkOverlay:visited,
    .gantt-print-linkOverlay:hover,
    .gantt-print-linkOverlay:active {
      position: absolute;
      inset: 0;
      color: transparent !important;
      background: transparent !important;
      text-decoration: none !important;
      border: 0 !important;
      outline: none !important;
      font-size: 0 !important;
      line-height: 0 !important;
    }

    .gantt-print-serviceName {
      font-size: 18px;
      font-weight: 600;
      line-height: 1.2;
      color: #111827;
    }

    .gantt-print-separator {
      font-size: 18px;
      font-weight: 500;
      line-height: 1.2;
      color: #6b7280;
    }

    .gantt-print-projectName {
      font-size: 18px;
      font-weight: 500;
      line-height: 1.2;
      color: #111827;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .gantt-print-headerDate {
      flex: 0 0 auto;
      font-size: 15px;
      font-weight: 500;
      white-space: nowrap;
      color: #6b7280;
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
    .gantt-print-root .gantt-tl-add-btn,
    .gantt-print-root .gantt-tl-name-actions,
    .gantt-print-root .gantt-tl-context-menu,
    .gantt-print-root .gantt-tl-dep-add,
    .gantt-print-root .gantt-tl-dep-delete-label,
    .gantt-print-root .gantt-tl-dep-source-picker,
    .gantt-print-root .gantt-tl-dep-type-menu,
    .gantt-print-root .gantt-tl-dep-type-trigger,
    .gantt-print-root .gantt-tl-number-steppers,
    .gantt-print-root .gantt-tr-resizeHandle {
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

    await copyDocumentStyles(sourceDocument, printDocument);
    createPrintStyle(printDocument, orientation);

    const root = printDocument.createElement('div');
    root.className = 'gantt-print-root';
    copyGanttCssVariables(sourceContainer, root);

    root.appendChild(createPrintHeader(printDocument, printTitle, header));
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

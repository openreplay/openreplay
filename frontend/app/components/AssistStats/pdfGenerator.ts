import html2canvas from '@codewonders/html2canvas';
import jsPDF from 'jspdf';

import { fileNameFormat } from 'App/utils';

const reportHead = new URL('../../assets/img/report-head.png', import.meta.url)
  .href;
const headerData = new URL(
  '../../assets/img/cobrowising-report-head.png',
  import.meta.url,
).href;

export const getPdf2 = async () => {
  const el = document.getElementById('pdf-anchor') as HTMLElement;
  if (!el) {
    console.error('PDF anchor element not found');
    return;
  }

  // @ts-ignore
  window.html2canvas = html2canvas;

  // Scroll to top of the element's container to ensure proper capture
  const scrollParent = el.parentElement;
  const originalScrollTop = scrollParent?.scrollTop ?? 0;
  if (scrollParent) {
    scrollParent.scrollTop = 0;
  }

  // Small delay to ensure content is fully rendered
  await new Promise((resolve) => setTimeout(resolve, 500));

  const canvas = await html2canvas(el, {
    scale: 2,
    ignoreElements: (e) => e.id.includes('pdf-ignore'),
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });
  document.body.appendChild(canvas);

  // Restore scroll position
  if (scrollParent) {
    scrollParent.scrollTop = originalScrollTop;
  }

  if (!canvas.width || !canvas.height) {
    console.error('Canvas capture failed');
    return;
  }

  // @ts-ignore
  const doc = new jsPDF('p', 'mm', 'a4');
  const now = new Date().toISOString();

  doc.addMetadata('Author', 'OpenReplay');
  doc.addMetadata('Title', 'OpenReplay Cobrowsing Report');
  doc.addMetadata('Subject', 'OpenReplay Cobrowsing Report');
  doc.addMetadata('Keywords', 'OpenReplay Cobrowsing Report');
  doc.addMetadata('Creator', 'OpenReplay');
  doc.addMetadata('Producer', 'OpenReplay');
  doc.addMetadata('CreationDate', now);

  const imgData = canvas.toDataURL('image/png');

  // A4 portrait dimensions in mm
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const headerHeight = 10;
  const footerHeight = 10;
  const contentWidth = pageWidth - 2 * margin;
  const contentHeight = pageHeight - headerHeight - footerHeight - margin;

  // Scale image to fit content width while maintaining aspect ratio
  const aspectRatio = canvas.width / canvas.height;
  const imgWidth = contentWidth;
  const imgHeight = imgWidth / aspectRatio;

  const logoWidth = 55;
  const headerW = 45;

  let heightLeft = imgHeight;
  let pageNum = 0;

  while (heightLeft > 0) {
    if (pageNum > 0) {
      doc.addPage();
    }

    // Calculate vertical offset for this page's portion of the image
    const sourceY = pageNum * contentHeight;
    const yPosition = headerHeight - sourceY;

    // Add content image
    doc.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);

    // Add header
    doc.addImage(headerData, 'PNG', (pageWidth - headerW) / 2, 2, headerW, 6);

    // Add footer
    doc.addImage(
      reportHead,
      'PNG',
      (pageWidth - logoWidth) / 2,
      pageHeight - footerHeight,
      logoWidth,
      6,
    );

    heightLeft -= contentHeight;
    pageNum++;
  }

  doc.save(fileNameFormat(`Assist_Stats_${Date.now()}`, '.pdf'));
};

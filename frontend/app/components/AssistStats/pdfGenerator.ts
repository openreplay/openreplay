import { fileNameFormat } from 'App/utils';

export const getPdf2 = async () => {
  // @ts-ignore
  import('html2canvas').then(({ default: html2canvas }) => {
    // @ts-ignore
    window.html2canvas = html2canvas;

    // @ts-ignore
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF('l', 'mm', 'a4');
      const now = new Date().toISOString();

      doc.addMetadata('Author', 'OpenReplay');
      doc.addMetadata('Title', 'OpenReplay Cobrowsing Report');
      doc.addMetadata('Subject', 'OpenReplay Cobrowsing Report');
      doc.addMetadata('Keywords', 'OpenReplay Cobrowsing Report');
      doc.addMetadata('Creator', 'OpenReplay');
      doc.addMetadata('Producer', 'OpenReplay');
      doc.addMetadata('CreationDate', now);

      const el = document.getElementById('pdf-anchor') as HTMLElement;

      function buildPng() {
        html2canvas(el, {
          scale: 2,
          ignoreElements: (e) => e.id.includes('pdf-ignore'),
        }).then((canvas) => {
          const imgData = canvas.toDataURL('img/png');

          let imgWidth = 290;
          let pageHeight = 200;
          let imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight - pageHeight;
          let position = 0;
          const A4Height = 295;
          const headerW = 40;
          const logoWidth = 55;
          doc.addImage(imgData, 'PNG', 3, 10, imgWidth, imgHeight);

          doc.addImage('/assets/img/cobrowising-report-head.png', 'png', A4Height / 2 - headerW / 2, 2, 45, 5);
          if (position === 0 && heightLeft === 0)
            doc.addImage(
              '/assets/img/report-head.png',
              'png',
              imgWidth / 2 - headerW / 2,
              pageHeight - 5,
              logoWidth,
              5
            );

          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
            doc.addImage(
              '/assets/img/report-head.png',
              'png',
              A4Height / 2 - headerW / 2,
              pageHeight - 5,
              logoWidth,
              5
            );
            heightLeft -= pageHeight;
          }

          doc.save(fileNameFormat('Assist_Stats_' + Date.now(), '.pdf'));
        });
      }

      buildPng();
    });
  });
};

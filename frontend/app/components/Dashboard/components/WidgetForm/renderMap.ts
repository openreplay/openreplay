export const renderClickmapThumbnail = () =>
  // @ts-ignore
  import('@codewonders/html2canvas').then(({ default: html2canvas }) => {
    // @ts-ignore
    window.html2canvas = html2canvas;
    const element = document.querySelector<HTMLIFrameElement>(
      '#clickmap-render  * iframe',
    )?.contentDocument?.body;
    if (element) {
      const dimensions = element.getBoundingClientRect();
      return html2canvas(element, {
        allowTaint: false,
        logging: true,
        scale: 1,
        useCORS: true,
        foreignObjectRendering: false,
        height: dimensions.height > 600 ? 600 : dimensions.height,
        width: dimensions.width > 900 ? 900 : dimensions.width,
        imageTimeout: 0,
        ignoreElements: (e) => {
          const isImage = e.tagName === 'IMG';
          const currentOrigin = window.location.origin;
          if (isImage) {
            const imgElement = e as HTMLImageElement;
            try {
              const imgSrc = new URL(imgElement.src);
              if (imgSrc.origin !== currentOrigin) {
                return true;
              }
            } catch {
              return true;
            }
          }
          return e.id.includes('render-ignore');
        },
        x: 0,
        y: 0,
      }).then((canvas) => canvas.toDataURL('img/png'));
    }
    return Promise.reject("can't find clickmap container");
  });

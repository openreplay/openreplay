export const renderClickmapThumbnail = async (withIframe?: boolean) => {
  // a card's thumbnail is the top of the page: the window alone, scrolled up
  const element = document.querySelector<HTMLElement>(
    '#clickmap-render .m-cmap__window',
  );
  let thumbnail: string | undefined;
  if (element) {
    // html2canvas is ~40 KB and only clickmap cards ever capture a thumbnail
    const { elementToImage, elementToCanvas } =
      await import('App/utils/screenCapture');
    const scrolled = element.scrollTop;
    element.scrollTop = 0;
    try {
      if (!withIframe) {
        console.debug('trying to render in canvas');
        thumbnail = await elementToCanvas(element);
      }
      if (!thumbnail) {
        thumbnail = await elementToImage(element);
      }
    } finally {
      element.scrollTop = scrolled;
    }
  }
  if (!thumbnail) {
    console.error('Failed to render clickmap thumbnail');
  }

  return thumbnail;
};

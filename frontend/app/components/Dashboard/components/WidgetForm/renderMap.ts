export const renderClickmapThumbnail = async (withIframe?: boolean) => {
  const element = document.querySelector<HTMLIFrameElement>('#clickmap-render');
  let thumbnail: string | undefined;
  if (element) {
    // html2canvas is ~40 KB and only clickmap cards ever capture a thumbnail
    const { elementToImage, elementToCanvas } = await import(
      'App/utils/screenCapture'
    );
    if (!withIframe) {
      console.debug('trying to render in canvas');
      thumbnail = withIframe ? undefined : await elementToCanvas(element);
    }
    if (!thumbnail) {
      thumbnail = await elementToImage(element);
    }
  }
  if (!thumbnail) {
    console.error('Failed to render clickmap thumbnail');
  }

  return thumbnail;
};

import {
  elementToImage,
  elementToCanvas,
  downscaleDataURL,
} from 'App/utils/screenCapture';

export const renderClickmapThumbnail = async (withIframe?: boolean) => {
  const element = document.querySelector<HTMLIFrameElement>('#clickmap-render');
  let thumbnail: string | undefined;
  if (element) {
    if (!withIframe) {
      console.debug('trying to render in canvas');
      thumbnail = withIframe ? undefined : await elementToCanvas(element);
    }
    if (!thumbnail) {
      thumbnail = await elementToImage(element);
      console.debug('trying to capture stream...', thumbnail);
    }
  }
  if (thumbnail) {
    thumbnail = await downscaleDataURL(thumbnail);
  }

  return thumbnail;
};

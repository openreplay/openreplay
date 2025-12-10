import {
  elementToImage,
  elementToCanvas,
  downscaleDataURL,
} from 'App/utils/screenCapture';

export const renderClickmapThumbnail = async () => {
  const element = document.querySelector<HTMLIFrameElement>(
    '#clickmap-render  * iframe',
  )?.contentDocument?.body;
  let thumbnail: string | undefined;
  if (element) {
    console.debug('trying to render in canvas');
    thumbnail = await elementToCanvas(element);
    if (!thumbnail) {
      console.debug('trying to capture stream');
      thumbnail = await elementToImage(element);
    }
  }
  if (thumbnail) {
    thumbnail = await downscaleDataURL(thumbnail);
  }

  return thumbnail;
};

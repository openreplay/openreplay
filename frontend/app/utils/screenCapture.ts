import html2canvas from '@codewonders/html2canvas';
import { toast } from 'react-toastify';

export async function elementToImage(
  element: Element | null,
  options?: { maxWidth?: number },
): Promise<string | undefined> {
  if (!element) {
    console.log('No element to capture');
    toast.error('No element to capture');
    return;
  }

  const constraints: MediaStreamConstraints = {
    video: {
      displaySurface: 'browser' as any,
      preferCurrentTab: true as any,
    },
    audio: false,
    monitorTypeSurfaces: 'exclude',
    preferCurrentTab: true,
  };

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    const [track] = stream.getVideoTracks();

    if (!track) {
      toast.error('Failed to capture screen image');
      return;
    }

    if (
      'CropTarget' in window &&
      typeof (window as any).CropTarget?.fromElement === 'function'
    ) {
      element.scrollIntoView({ block: 'nearest' });
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const cropTarget = await (window as any).CropTarget.fromElement(element);
      await (track as any).cropTo(cropTarget);
    }

    const imageCapture = new ImageCapture(track);

    // unsupported for ff
    const bitmap = await imageCapture.grabFrame?.();
    stream.getTracks().forEach((t) => t.stop());

    if (!bitmap) {
      toast.error('Failed to capture screen image');
      return;
    }

    console.log(bitmap)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      toast.error('Failed to capture screen image');
      return;
    }

    const maxWidth = options?.maxWidth ?? 300;
    let targetWidth = bitmap.width;
    let targetHeight = bitmap.height;

    if (targetWidth > maxWidth) {
      const scale = maxWidth / targetWidth;
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = Math.round(targetHeight * scale);
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.log(e);
    toast.error('Failed to capture screen image');
  }
}

export function elementToCanvas(el: HTMLElement): Promise<string | undefined> {
  const srcMap = new WeakMap<HTMLImageElement, string>();
  const images = el.querySelectorAll('img');
  images.forEach((img) => {
    const sameOrigin =
      new URL(img.src, location.href).origin === location.origin;
    if (!sameOrigin) {
      const size = img.getBoundingClientRect();
      img.width = size.width;
      img.height = size.height;
      srcMap.set(img, img.src);
      img.src = '';
    }
  });
  return html2canvas(el, {
    scale: 1,
    allowTaint: false,
    foreignObjectRendering: true,
    useCORS: true,
    logging: true,
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
  })
    .then((canvas) => {
      images.forEach((img) => {
        if (srcMap.has(img)) img.src = srcMap.get(img)!;
      });
      return canvas.toDataURL('image/png');
    })
    .catch((e) => {
      console.log(e);
      return undefined;
    });
}

export async function downscaleDataURL(
  dataUrl: string,
  maxW = 1280,
  maxH = 720,
  outType = 'image/png',
  quality = 1,
) {
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = dataUrl;
    await img.decode();

    const w = img.naturalWidth,
      h = img.naturalHeight;
    const s = Math.min(1, maxW / w, maxH / h);
    const newW = Math.round(w * s);
    const newH = Math.round(h * s);

    const c = document.createElement('canvas');
    c.width = newW;
    c.height = newH;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, newW, newH);

    const mime = outType || dataUrl.match(/^data:(.*?);/)?.[1] || 'image/png';
    return c.toDataURL(mime, quality);
  } catch (e) {
    console.log('downscale', e);
    return dataUrl;
  }
}

export const convertAllImagesToBase64 = (proxyURL, cloned) => {
  const pendingImagesPromises = [];
  const pendingPromisesData = [];

  const images = cloned.getElementsByTagName('img');

  for (let i = 0; i < images.length; i += 1) {
    const promise = new Promise((resolve, reject) => {
      pendingPromisesData.push({
        index: i,
        resolve,
        reject,
      });
    });
    pendingImagesPromises.push(promise);
  }

  for (let i = 0; i < images.length; i += 1) {
    fetch(`${proxyURL}?url=${images[i].src}`)
      .then((response) => response.json())
      .then((data) => {
        const pending = pendingPromisesData.find((p) => p.index === i);
        images[i].src = data;
        pending.resolve(data);
      })
      .catch((e) => {
        const pending = pendingPromisesData.find((p) => p.index === i);
        pending.reject(e);
      });
  }

  return Promise.all(pendingImagesPromises);
};

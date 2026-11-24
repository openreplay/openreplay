import { toast } from '@/ui/overlays/toast';
import html2canvas from '@codewonders/html2canvas';

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

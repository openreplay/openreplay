const EMOJI_REGEX =
  /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*?/gu;

function createEmojiImage(emoji: string, parentEl: HTMLElement) {
  const computedStyle = window.getComputedStyle(parentEl);
  const fontSize = Number.parseInt(computedStyle.fontSize || '16', 10) || 16;

  const emojiSize = Math.round(fontSize * 1.2);
  const canvasSize = emojiSize * 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `${canvasSize}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.fillText(emoji, canvasSize / 2, canvasSize / 2);

  const img = document.createElement('img');
  img.src = canvas.toDataURL('image/png');
  img.style.width = `${emojiSize}px`;
  img.style.height = `${emojiSize}px`;
  img.style.verticalAlign = 'middle';
  img.style.display = 'inline-block';
  img.style.margin = '0 1px';

  return img;
}

export function replaceEmojisWithImages(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  const textNodes: Text[] = [];
  let n: Node | null = walker.nextNode();
  while (n) {
    textNodes.push(n as Text);
    n = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const text = textNode.textContent ?? '';
    const matches = text.match(EMOJI_REGEX);
    if (!matches?.length) return;

    const parentEl = (textNode.parentElement ?? root) as HTMLElement;
    const fragment = document.createDocumentFragment();

    let lastIndex = 0;
    matches.forEach((emoji) => {
      const idx = text.indexOf(emoji, lastIndex);
      if (idx === -1) return;

      const before = text.slice(lastIndex, idx);
      if (before) fragment.appendChild(document.createTextNode(before));

      const img = createEmojiImage(emoji, parentEl);
      if (img) fragment.appendChild(img);
      else fragment.appendChild(document.createTextNode(emoji));

      lastIndex = idx + emoji.length;
    });

    const after = text.slice(lastIndex);
    if (after) fragment.appendChild(document.createTextNode(after));

    textNode.parentNode?.replaceChild(fragment, textNode);
  });
}

export async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  );
}

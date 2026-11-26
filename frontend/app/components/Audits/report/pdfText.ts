import type { jsPDF } from 'jspdf';

// jsPDF's built-in fonts cover WinAnsi only; the rest is spelled out
const ASCII: Record<string, string> = {
  '−': '-',
  '–': '-',
  '—': '-',
  '≈': '~',
  '±': '+/-',
  '▲': '+',
  '▼': '-',
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '…': '...',
  '≤': '<=',
  '≥': '>=',
  '×': 'x',
  '→': '->',
};
const safe = (s: string) =>
  s.replace(/[^\x20-\x7E\xA0-\xFF]/g, (c) => ASCII[c] ?? '');

interface Line {
  text: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// px are the page's units (format 1600 x 900, px_scaling): 1px = 0.75pt
const PT_PER_PX = 0.75;

function emit(pdf: jsPDF, l: Line, size: number, origin: DOMRect) {
  const text = safe(l.text);
  if (!text.trim()) return;
  pdf.setFontSize(size * PT_PER_PX);
  const natural = pdf.getTextWidth(text);
  // glyphs stretched rather than letters spaced: readers take wide gaps for spaces
  pdf.text(text, l.left - origin.left, (l.top + l.bottom) / 2 - origin.top, {
    baseline: 'middle',
    renderingMode: 'invisible',
    horizontalScale: natural > 0 ? (l.right - l.left) / natural : 1,
  });
}

/** Right edge of the nearest clipping ancestor below the slide (ellipsis-truncated lines). */
function clipRight(el: HTMLElement, slide: HTMLElement) {
  let right = Infinity;
  for (let a: HTMLElement | null = el; a && a !== slide; a = a.parentElement) {
    if (getComputedStyle(a).overflowX !== 'visible')
      right = Math.min(right, a.getBoundingClientRect().right);
  }
  return right;
}

/**
 * The slide's words as invisible text over its picture, line by line where the browser
 * drew them, so the PDF can be searched and copied from while it looks exactly the same.
 */
export function addTextLayer(pdf: jsPDF, slide: HTMLElement) {
  const box = slide.getBoundingClientRect();
  const range = document.createRange();
  const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
  pdf.setFont('helvetica', 'normal');
  // a middle-cut line is two spans: its whole text goes over what is shown of it
  slide.querySelectorAll<HTMLElement>('.m-rep-s__mid').forEach((mid) => {
    const head = mid.firstElementChild?.getBoundingClientRect();
    const tail = mid.lastElementChild?.getBoundingClientRect();
    if (!head || !tail || !tail.width) return;
    emit(
      pdf,
      {
        text: mid.title,
        left: head.left,
        right: Math.min(tail.right, clipRight(mid, slide)),
        top: tail.top,
        bottom: tail.bottom,
      },
      parseFloat(getComputedStyle(mid).fontSize) || 12,
      box,
    );
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    const el = node.parentElement;
    if (!text.trim() || !el || el.closest('.m-rep-s__mid')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const size = parseFloat(cs.fontSize) || 12;
    const upper = cs.textTransform === 'uppercase';
    const clip = clipRight(el, slide);
    let line: Line | null = null;
    for (const m of text.matchAll(/\S+/g)) {
      const at = m.index ?? 0;
      const word = upper ? m[0].toUpperCase() : m[0];
      range.setStart(node, at);
      range.setEnd(node, at + m[0].length);
      const r = range.getBoundingClientRect();
      if (
        !r.width ||
        r.right > clip + 0.5 ||
        r.right < box.left ||
        r.left > box.right ||
        r.bottom < box.top ||
        r.top > box.bottom
      )
        continue;
      if (
        line &&
        Math.abs(r.top - line.top) < size / 2 &&
        r.left >= line.right - 1
      ) {
        line.text += ` ${word}`;
        line.right = r.right;
        line.bottom = Math.max(line.bottom, r.bottom);
      } else {
        if (line) emit(pdf, line, size, box);
        line = {
          text: word,
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
        };
      }
    }
    if (line) emit(pdf, line, size, box);
  }
}

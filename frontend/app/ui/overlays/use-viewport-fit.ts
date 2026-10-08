import {
  type Ref,
  type RefCallback,
  useCallback,
  useLayoutEffect,
  useState,
} from 'react';

const PAD = 8;

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}

/**
 * Radix flips an overlay to the other side when that side has room, but never slides it
 * along its side, so one taller than the room on both sides runs off-screen. This nudges
 * the content back inside the viewport (over its trigger if it has to) through
 * `--m-pop-fit`, and caps it with a scroll when it is taller than the viewport itself.
 */
export function useViewportFit<T extends HTMLElement>(
  forwarded?: Ref<T>,
): RefCallback<T> {
  const [el, setEl] = useState<T | null>(null);

  useLayoutEffect(() => {
    if (!el) return undefined;
    // Radix's popper wrapper: positioned by transform, unaffected by our own shift
    const anchor = el.parentElement ?? el;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const vh = window.innerHeight;
        const room = vh - PAD * 2;
        const tall = el.scrollHeight > room;
        el.style.maxHeight = tall ? `${room}px` : '';
        el.style.overflowY = tall ? 'auto' : '';
        const top = anchor.getBoundingClientRect().top;
        const bottom = top + el.offsetHeight;
        const shift =
          bottom > vh - PAD
            ? Math.max(vh - PAD - bottom, PAD - top)
            : top < PAD
              ? Math.min(PAD - top, vh - PAD - bottom)
              : 0;
        el.style.setProperty('--m-pop-fit', `${Math.round(shift)}px`);
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    // Radix repositions (scroll, flip, trigger move) by rewriting the wrapper's style
    const mo = new MutationObserver(fit);
    if (anchor !== el)
      mo.observe(anchor, { attributes: true, attributeFilter: ['style'] });
    window.addEventListener('resize', fit);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [el]);

  return useCallback(
    (node: T | null) => {
      setEl(node);
      assignRef(forwarded, node);
    },
    [forwarded],
  );
}

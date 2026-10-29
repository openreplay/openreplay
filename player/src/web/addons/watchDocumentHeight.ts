/**
 * Calls onChange when the replay document's height changes. A frozen replay still
 * reflows when late images, fonts or stylesheets arrive, after an overlay was sized.
 * Returns the unsubscribe function.
 */
export function watchDocumentHeight(
  doc: Document,
  onChange: () => void,
): () => void {
  let height = doc.documentElement.scrollHeight;
  let frame = 0;
  const check = () => {
    frame = 0;
    const next = doc.documentElement.scrollHeight;
    if (next !== height) {
      height = next;
      onChange();
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(check);
  };

  // the iframe's own realm, as for every other DOM API on replay nodes
  const RO: typeof ResizeObserver =
    (doc.defaultView as any)?.ResizeObserver ?? ResizeObserver;
  const observer = new RO(schedule);
  observer.observe(doc.documentElement);
  if (doc.body) observer.observe(doc.body);
  // load doesn't bubble; capture catches every <img>/<link> in the document
  doc.addEventListener('load', schedule, true);

  return () => {
    observer.disconnect();
    doc.removeEventListener('load', schedule, true);
    cancelAnimationFrame(frame);
  };
}

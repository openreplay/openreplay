/**
 * Native <select> pickers are browser chrome: opening them requires transient
 * activation (a real user gesture), which replay playback never has. So we can't
 * reopen the real dropdown a user saw. Instead, when a recorded click lands on a
 * <select>, we draw a synthetic option list in the overlay layer that approximates
 * the open picker, highlight the recorded value, and dismiss it on the next
 * interaction event (click / focus / input) that isn't the select itself.
 */
export default class SelectDropdown {
  private readonly container: HTMLDivElement;
  private currentSelect: HTMLSelectElement | null = null;
  private confirmTimeout?: ReturnType<typeof setTimeout>;
  // Document we attached the scroll listener to, so we can detach it on hide.
  private scrollDoc: Document | null = null;
  private readonly onScroll = () => this.hide();
  // Brief hold after the recorded value lands, so the picked option is visible
  // before the picker closes. This is a pick confirmation, not an idle timeout.
  private static readonly CONFIRM_MS = 450;

  constructor(private readonly overlay: HTMLDivElement) {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      display: 'none',
      zIndex: '9',
      boxSizing: 'border-box',
      maxHeight: '240px',
      overflowY: 'auto',
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.2)',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
      padding: '4px 0',
      font: '13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#111',
      pointerEvents: 'none',
    });
    overlay.appendChild(this.container);
  }

  /**
   * Show the synthetic dropdown positioned under `select`, listing its options
   * with the currently-selected one highlighted.
   */
  open(select: HTMLSelectElement): void {
    if (select.options.length === 0) {
      this.hide();
      return;
    }
    let rect: DOMRect;
    try {
      rect = select.getBoundingClientRect();
    } catch {
      return;
    }
    // Element not rendered / not visible — nothing to anchor to.
    if (rect.width === 0 && rect.height === 0) {
      return;
    }
    this.clearConfirmTimeout();
    this.detachScroll();
    this.currentSelect = select;
    this.render(select);
    // The overlay shares the iframe's coordinate origin and scales with it, so
    // iframe-viewport coords from getBoundingClientRect map straight to overlay
    // coords. Anchor under the select.
    Object.assign(this.container.style, {
      display: 'block',
      left: `${rect.left}px`,
      top: `${rect.bottom}px`,
      minWidth: `${rect.width}px`,
    });
    // The dropdown is anchored at a fixed point; once the page scrolls the select
    // moves out from under it, so dismiss (like a real native picker). Capture
    // phase catches non-bubbling scrolls on inner containers too.
    this.scrollDoc = select.ownerDocument;
    this.scrollDoc?.addEventListener('scroll', this.onScroll, {
      capture: true,
      passive: true,
    });
  }

  /**
   * A recorded input/value change was applied. If it's the open select, move the
   * highlight to the chosen option then close (pick confirmation). Any other
   * element changing means the user moved on — close immediately.
   */
  onValueApplied(node: Node): void {
    if (!this.currentSelect) {
      return;
    }
    if (node === this.currentSelect) {
      this.render(this.currentSelect);
      this.clearConfirmTimeout();
      this.confirmTimeout = setTimeout(() => this.hide(), SelectDropdown.CONFIRM_MS);
    } else {
      this.hide();
    }
  }

  /**
   * A recorded focus change was applied. Focus landing on the open select itself
   * (e.g. the very click that opened it) is ignored; focus moving anywhere else
   * — or a blur (node null) — closes the picker.
   */
  onFocus(node: Node | null): void {
    if (!this.currentSelect || node === this.currentSelect) {
      return;
    }
    this.hide();
  }

  hide(): void {
    this.clearConfirmTimeout();
    this.detachScroll();
    this.container.style.display = 'none';
    this.container.replaceChildren();
    this.currentSelect = null;
  }

  remove(): void {
    this.hide();
    this.container.remove();
  }

  private detachScroll(): void {
    if (this.scrollDoc) {
      this.scrollDoc.removeEventListener('scroll', this.onScroll, {
        capture: true,
      });
      this.scrollDoc = null;
    }
  }

  private render(select: HTMLSelectElement): void {
    const frag = document.createDocumentFragment();
    const options = Array.from(select.options);
    for (const opt of options) {
      const item = document.createElement('div');
      Object.assign(item.style, {
        padding: '4px 12px',
        whiteSpace: 'nowrap',
      });
      item.textContent = opt.label || opt.text || opt.value || ' ';
      if (opt.disabled) {
        item.style.color = '#9aa0a6';
      }
      if (opt.selected) {
        item.style.background = '#e8f0fe';
        item.style.fontWeight = '600';
      }
      frag.appendChild(item);
    }
    this.container.replaceChildren(frag);
    this.container.scrollTop = 0;
  }

  private clearConfirmTimeout(): void {
    if (this.confirmTimeout) {
      clearTimeout(this.confirmTimeout);
      this.confirmTimeout = undefined;
    }
  }
}

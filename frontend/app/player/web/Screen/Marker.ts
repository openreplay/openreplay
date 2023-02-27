import type Screen from './Screen'
import styles from './marker.module.css';

const metaCharsMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

function escapeHtml(str: string) {
  return String(str).replace(/[&<>"'`=\/]/g, function (s) {
    // @ts-ignore
    return metaCharsMap[s];
  });
}


function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function safeString(string: string) {
  return (escapeHtml(escapeRegExp(string)))
}

export default class Marker {
  private _target: Element | null = null;
  private selector: string | null = null;
  private tooltip: HTMLDivElement
  private marker: HTMLDivElement

  constructor(overlay: HTMLElement, private readonly screen: Screen) {
    this.tooltip = document.createElement('div');
    this.tooltip.className = styles.tooltip;
    this.tooltip.appendChild(document.createElement('div'));

    const htmlStr = document.createElement('div');
    htmlStr.innerHTML = '<b>Right-click > Inspect</b> for more details.';
    this.tooltip.appendChild(htmlStr);

    const marker = document.createElement('div');
    marker.className = styles.marker;
    const markerL = document.createElement('div');
    const markerR = document.createElement('div');
    const markerT = document.createElement('div');
    const markerB = document.createElement('div');
    markerL.className = styles.markerL;
    markerR.className = styles.markerR;
    markerT.className = styles.markerT;
    markerB.className = styles.markerB;
    marker.appendChild(markerL);
    marker.appendChild(markerR);
    marker.appendChild(markerT);
    marker.appendChild(markerB);

    marker.appendChild(this.tooltip);

    overlay.appendChild(marker);
    this.marker = marker;
  }

  get target() {
    return this._target;
  }

  mark(element: Element | null) {
    if (this._target === element) {
      return;
    }
    this._target = element;
    this.selector = null;
    this.redraw();
  }

  unmark() {
    this.mark(null)
  }

  private autodefineTarget() {
    // TODO: put to Screen
    if (this.selector) {
      try {
        const fitTargets = this.screen.document.querySelectorAll(this.selector);
        if (fitTargets.length === 0) {
          this._target = null;
        } else {
          // TODO: fix getCursorTarget()?
          // this._target = fitTargets[0];
          // const cursorTarget = this.screen.getCursorTarget();
          // fitTargets.forEach((target) => {
          //   if (target.contains(cursorTarget)) {
          //     this._target = target;
          //   }
          // });
        }
      } catch (e) {
        console.info(e);
      }
    } else {
      this._target = null;
    }
  }

  markBySelector(selector: string) {
    this.selector = selector;
    this.autodefineTarget();
    this.redraw();
  }

  private getTagString(el: Element) {
    const attrs = el.attributes;
    let str = `<span style="color:#9BBBDC">${el.tagName.toLowerCase()}</span>`;

    for (let i = 0; i < attrs.length; i++) {
      let k = attrs[i];
      const attribute = k.name;
      if (attribute === 'class') {
        str += `<span style="color:#F29766">${'.' + safeString(k.value).split(' ').join('.')}</span>`;
      }

      if (attribute === 'id') {
        str += `<span style="color:#F29766">${'#' + safeString(k.value).split(' ').join('#')}</span>`;
      }
    }

    return str;
  }

  redraw() {
    if (this.selector) {
      this.autodefineTarget();
    }
    if (!this._target) {
      this.marker.style.display = 'none';
      return;
    }
    const rect = this._target.getBoundingClientRect();
    this.marker.style.display = 'block';
    this.marker.style.left = rect.left + 'px';
    this.marker.style.top = rect.top + 'px';
    this.marker.style.width = rect.width + 'px';
    this.marker.style.height = rect.height + 'px';

    this.tooltip.firstChild.innerHTML = this.getTagString(this._target);
  }
}

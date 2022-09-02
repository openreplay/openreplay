import styles from './marker.module.css';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeHtml(string) {
  return string.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function safeString(string) {
  return (escapeHtml(escapeRegExp(string)))
}

export default class Marker {
  _target = null;
  _selector = null;
  _tooltip = null;

  constructor(overlay, screen) {
    this.screen = screen;

    this._tooltip = document.createElement('div');
    this._tooltip.className = styles.tooltip;
    this._tooltip.appendChild(document.createElement('div'));

    const htmlStr = document.createElement('div');
    htmlStr.innerHTML = '<b>Right-click > Inspect</b> for more details.';
    this._tooltip.appendChild(htmlStr);

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

    marker.appendChild(this._tooltip);

    overlay.appendChild(marker);
    this._marker = marker;
  }

  get target() {
    return this._target;
  }

  mark(element) {
    if (this._target === element) {
      return;
    }
    this._target = element;
    this._selector = null;
    this.redraw();
  }

  unmark() {
    this.mark(null);
  }

  _autodefineTarget() {
    // TODO: put to Screen
    if (this._selector) {
      try {
        const fitTargets = this.screen.document.querySelectorAll(this._selector);
        if (fitTargets.length === 0) {
          this._target = null;
        } else {
          this._target = fitTargets[0];
          const cursorTarget = this.screen.getCursorTarget();
          fitTargets.forEach((target) => {
            if (target.contains(cursorTarget)) {
              this._target = target;
            }
          });
        }
      } catch (e) {
        console.info(e);
      }
    } else {
      this._target = null;
    }
  }

  markBySelector(selector) {
    this._selector = selector;
    this._autodefineTarget();
    this.redraw();
  }

  getTagString(tag) {
    const attrs = tag.attributes;
    let str = `<span style="color:#9BBBDC">${tag.tagName.toLowerCase()}</span>`;

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
    if (this._selector) {
      this._autodefineTarget();
    }
    if (!this._target) {
      this._marker.style.display = 'none';
      return;
    }
    const rect = this._target.getBoundingClientRect();
    this._marker.style.display = 'block';
    this._marker.style.left = rect.left + 'px';
    this._marker.style.top = rect.top + 'px';
    this._marker.style.width = rect.width + 'px';
    this._marker.style.height = rect.height + 'px';

    this._tooltip.firstChild.innerHTML = this.getTagString(this._target);
  }
}

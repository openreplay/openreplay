import React from 'react';
import { findDOMNode } from 'react-dom';

let overlayedCount = 0;

const ID = 'openreplay-overlay';
const Z_BASE = 99990;

const overlay = document.createElement("div");
overlay.setAttribute('id', ID);

// TODO: use className (class attribute)
overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
overlay.style.position = 'fixed';
overlay.style.left = 0;
overlay.style.right = 0;
overlay.style.bottom = 0;
overlay.style.top = 0;
overlay.style.zIndex = Z_BASE;

const withOverlay = (
  overlayedName = 'overlayed', 
  clickHandlerName = 'onOverlayClick', 
  zIndex = 0,
) => BaseComponent => {
  return class extends React.Component {
    constructor(props) {
      super(props);
      this.baseRef = React.createRef();
      if (props[ overlayedName ]) {
        overlayedCount++;
      }
    }

    componentDidMount() {
      this.renderOverlay();
      this.setOverlayedStyles();
    }

    componentDidUpdate(prevProps) {
      if (prevProps[ overlayedName ] !== this.props[ overlayedName ]) {
        if (!this.props[ overlayedName ]) {
          overlayedCount--;
        }
        if (this.props[ overlayedName ]) {
          overlayedCount++;
        }
        this.renderOverlay();
        this.setOverlayedStyles();
      }
    }

    clickHandler = () => {
      const clickHandler = this.props[ clickHandlerName ];
      if (clickHandler) clickHandler();
    }

    renderOverlay() {
      if (overlayedCount > 0) {
        if (overlay.parentNode === null) {
          document.body.appendChild(overlay);
        }
        if (this.props[ overlayedName ]) {
          overlay.addEventListener('click', this.clickHandler);
        }
      } else if (overlay.parentNode !== null) {
        overlay.parentNode.removeChild(overlay);
      }
    }

    setOverlayedStyles() {
      const baseRoot = findDOMNode(this.baseRef.current);
      const overlayed = this.props[ overlayedName ];
      const actualZIndex = Z_BASE + 1 + zIndex;
      if (baseRoot) {
        // TODO: care about styles rewriting case
        baseRoot.style.position = 'relative';
        baseRoot.style.zIndex = overlayed ? actualZIndex : 'initial';
      }
    }

    render() {
      return <BaseComponent { ...this.props } ref={ this.baseRef } />;
    }
  };
}

export default withOverlay;

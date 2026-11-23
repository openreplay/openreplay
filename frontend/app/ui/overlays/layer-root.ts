let root: HTMLElement | null = null;

/** Where dialogs portal their scrim and panel. Both sit at the same z-index, so
    their DOM order decides which paints on top; as separate <body> children that
    order can be swapped by extensions that reorder body (Bitwarden's inline menu
    moves each node appended after it back in front of it, one by one), leaving
    the scrim over the panel and eating its clicks. */
export function layerRoot(): HTMLElement {
  if (!root?.isConnected) {
    root = document.createElement('div');
    root.dataset.slot = 'layers';
    document.body.appendChild(root);
  }
  return root;
}

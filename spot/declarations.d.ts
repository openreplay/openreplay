declare global {
  function defineBackground(cb: () => any): any
  const chrome: typeof import('wxt/browser')['browser']
  const browser: typeof import('wxt/browser')['browser']
}

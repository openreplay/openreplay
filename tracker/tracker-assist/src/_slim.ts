
/**
 * Hack for the peerjs compilation on angular
 * About this issue: https://github.com/peers/peerjs/issues/552
 */

// @ts-ignore
typeof window !== 'undefined' && (window.parcelRequire = window.parcelRequire || undefined)

// jsdom in jest-environment-jsdom 29 does not expose TextEncoder/TextDecoder
// on the global. Polyfill from node:util so modules that touch them at import
// time (e.g. Assist.ts) load in the test environment.
import { TextEncoder, TextDecoder, } from 'util'

if (typeof (globalThis as any).TextEncoder === 'undefined') {
  ;(globalThis as any).TextEncoder = TextEncoder
}
if (typeof (globalThis as any).TextDecoder === 'undefined') {
  ;(globalThis as any).TextDecoder = TextDecoder
}

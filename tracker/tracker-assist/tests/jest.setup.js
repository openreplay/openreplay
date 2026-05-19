// jsdom in jest-environment-jsdom 29 does not expose TextEncoder/TextDecoder
// on the global. Polyfill from node:util so modules that touch them at import
// time (e.g. Assist.ts) load in the test environment.
import { TextEncoder, TextDecoder, } from 'util';
if (typeof globalThis.TextEncoder === 'undefined') {
    ;
    globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
    ;
    globalThis.TextDecoder = TextDecoder;
}

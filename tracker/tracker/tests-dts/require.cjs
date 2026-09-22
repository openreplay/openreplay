// Runtime guard: the CJS bundle must actually load under require(). Without
// dist/cjs/package.json this throws "exports is not defined in ES module scope",
// because the package root declares "type": "module".
const assert = require('node:assert')
const tracker = require('@openreplay/tracker')

assert.strictEqual(typeof tracker.default, 'function', 'expected a default export')
assert.strictEqual(typeof tracker.tracker, 'object', 'expected the tracker singleton')
console.log('require() of dist/cjs OK')

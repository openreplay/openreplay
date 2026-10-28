// Same guard from a CommonJS resolution context, which additionally covers the
// require condition and dist/cjs being marked "type": "commonjs".
import tracker, { Options, SanitizeLevel } from '@openreplay/tracker'

export const cjsDefault: typeof tracker = tracker
export const cjsSanitize: SanitizeLevel = SanitizeLevel.Obscured
export type CjsOptions = Partial<Options>

// eslint-disable-next-line @typescript-eslint/no-var-requires
import cjsEntry = require('@openreplay/tracker/cjs')
export const cjsSubpath: typeof cjsEntry.default = cjsEntry.default

import type { CaptureSanitizer } from '@openreplay/tracker'
export const policy: CaptureSanitizer = (data) => (data.kind === 'css' ? data.value : null)
export const policyOptions: CjsOptions = { captureSanitizer: policy }

export function discardType(instance: InstanceType<typeof tracker>): void {
  const result: void = instance.discard()
  return result
}

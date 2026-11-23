// Same guard from a CommonJS resolution context, which additionally covers the
// require condition and dist/cjs being marked "type": "commonjs".
import tracker, { Options, SanitizeLevel } from '@openreplay/tracker'

export const cjsDefault: typeof tracker = tracker
export const cjsSanitize: SanitizeLevel = SanitizeLevel.Obscured
export type CjsOptions = Partial<Options>

// eslint-disable-next-line @typescript-eslint/no-var-requires
import cjsEntry = require('@openreplay/tracker/cjs')
export const cjsSubpath: typeof cjsEntry.default = cjsEntry.default

import type { CaptureData as RootCaptureData, CaptureSanitizer as RootCaptureSanitizer } from '@openreplay/tracker'
import type { CaptureData, CaptureSanitizer } from '@openreplay/tracker/cjs'
export const policy: CaptureSanitizer = (data) => {
  switch (data.kind) {
    case 'attribute': return data.name
    case 'css': return data.source
    case 'font': return data.field
    case 'resource': return data.resourceType
  }
}
export const policyOptions: ConstructorParameters<typeof cjsEntry.default>[0] = { captureSanitizer: policy }
export const rootCaptureOptions: ConstructorParameters<typeof tracker>[0] = {
  captureSanitizer: (data: RootCaptureData) => policy(data),
}
export const rootPolicy: RootCaptureSanitizer = policy
export const defaultCaptureOptions: ConstructorParameters<typeof cjsEntry.default>[0] = {}
export const captureKinds: Record<CaptureData['kind'], true> = {
  attribute: true, css: true, font: true, resource: true,
}

export function discardType(instance: InstanceType<typeof cjsEntry.default>): void {
  const result: void = instance.discard()
  return result
}

export function discardRootType(instance: InstanceType<typeof tracker>): void {
  return instance.discard()
}

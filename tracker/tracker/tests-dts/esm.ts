// Regression guard: the published declarations must typecheck for a strict
// NodeNext consumer with skipLibCheck off. Extensionless relative imports in
// the emitted .d.ts files fail here with TS2834.
import tracker, { App, Analytics, Messages, Options, SanitizeLevel } from '@openreplay/tracker'
import TrackerClass from '@openreplay/tracker/class'

export const esmDefault: typeof tracker = tracker
export const esmMessages: typeof Messages = Messages
export const esmSanitize: SanitizeLevel = SanitizeLevel.Obscured
export type EsmApp = App
export type EsmAnalytics = Analytics
export type EsmOptions = Partial<Options>
export type EsmTrackerClass = TrackerClass
// nested option groups accept partial objects
export const esmPartialNetwork: Partial<Options> = { network: { capturePayload: true } }

// The optional policy and semantic contexts must survive published entrypoint bundling.
import type { CaptureData, CaptureSanitizer } from '@openreplay/tracker'
export const policy: CaptureSanitizer = (data: CaptureData) => {
  switch (data.kind) {
    case 'attribute': return data.name
    case 'css': return data.source
    case 'font': return data.field
    case 'resource': return data.resourceType
    case 'svg': return data.value
  }
}
export const policyOptions: EsmOptions = { captureSanitizer: policy }
export const defaultCaptureOptions: ConstructorParameters<typeof tracker>[0] = {}
export const captureKinds: Record<CaptureData['kind'], true> = {
  attribute: true, css: true, font: true, resource: true, svg: true,
}

export function discardType(instance: TrackerClass): void {
  const result: void = instance.discard()
  return result
}

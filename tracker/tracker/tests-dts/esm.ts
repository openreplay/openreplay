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

// The optional policy and semantic contexts must survive published entrypoint bundling.
import type { CaptureData, CaptureSanitizer } from '@openreplay/tracker'
export const policy: CaptureSanitizer = (data: CaptureData) =>
  data.kind === 'attribute' && data.name === 'class' ? data.value : null
export const policyOptions: EsmOptions = { captureSanitizer: policy }

export function discardType(instance: TrackerClass): void {
  const result: void = instance.discard()
  return result
}

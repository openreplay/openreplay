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

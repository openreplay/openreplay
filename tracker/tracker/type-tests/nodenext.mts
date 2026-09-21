/** Compile-only consumer of the emitted SDK declarations; never starts a tracker. */
import Tracker, { App, Analytics, tracker, openReplay } from '../dist/types/main/entry.js'

export type PublicSdk = {
  constructor: typeof Tracker
  app: typeof App
  analytics: typeof Analytics
  singleton: typeof tracker
  alias: typeof openReplay
}

export const options: ConstructorParameters<typeof Tracker>[0] = { projectKey: 'typecheck-only' }

// A successful import must retain the real SDK types, rather than becoming any.
// @ts-expect-error projectKey must be a string.
export const invalidOptions: ConstructorParameters<typeof Tracker>[0] = { projectKey: 123 }

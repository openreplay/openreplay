export const usageCode = `import { tracker } from '@openreplay/tracker';

tracker.configure({
  projectKey: "PROJECT_KEY",
  ingestPoint: "https://${window.location.hostname}/ingest",
});

tracker.start()`;

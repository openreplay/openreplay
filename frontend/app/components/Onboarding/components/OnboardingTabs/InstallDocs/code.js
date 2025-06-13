export const usageCode = `import { tracker } from '@openreplay/tracker';

tracker.configure({
  projectKey: "PROJECT_KEY",
  ingestPoint: "https://${window.location.hostname}/ingest",
});
tracker.start()`;
export const usageCodeSST = `import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope

tracker.configure({
  projectKey: "PROJECT_KEY",
  ingestPoint: "https://${window.location.hostname}/ingest",
});

function MyApp() {
  useEffect(() => { // use componentDidMount in case of React Class Component
    tracker.start()
  }, []);

  //...
}`;

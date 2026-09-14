/* `import * as Flags from 'country-flag-icons/react/3x2'` pulled all ~267 flags
   in as React components — 325KB of source, 8% of the entry vendor chunk, for a
   handful of flags ever shown on screen. The SVGs ship in the same package, so
   they are emitted as hashed assets instead and fetched on demand: the bundle
   keeps only this code -> URL map, and the browser caches each flag it sees.

   Kept in its own module because `import.meta.glob` is Vite-only syntax that
   Jest's CJS transform cannot parse — jest.config.mjs maps this path to a stub. */
const flagUrls = import.meta.glob<string>(
  '../../../node_modules/country-flag-icons/3x2/*.svg',
  { query: '?url', import: 'default', eager: true },
);

const byCode: Record<string, string> = {};
for (const [filePath, url] of Object.entries(flagUrls)) {
  const code = filePath.slice(
    filePath.lastIndexOf('/') + 1,
    -'.svg'.length,
  );
  byCode[code] = url;
}

export const flagUrl = (countryCode: string): string | undefined =>
  byCode[countryCode?.toUpperCase()];

export default byCode;

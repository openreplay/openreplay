/* Importing the package's React components pulled in all ~267 flags, 325KB of
   source. The SVGs ship alongside them, so emit those as hashed assets and keep
   only a code -> URL map here.

   Its own module because `import.meta.glob` is Vite-only syntax that Jest's CJS
   transform cannot parse — jest.config.mjs maps this path to a stub. */
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

// app/components/shared/flagAssets.ts builds its lookup with `import.meta.glob`,
// which Jest's CJS transform cannot parse. Tests only care that a code maps to
// some URL, so return a predictable stub.
module.exports = {
  __esModule: true,
  flagUrl: (countryCode) =>
    countryCode ? `${String(countryCode).toUpperCase()}.svg` : undefined,
  default: {},
};

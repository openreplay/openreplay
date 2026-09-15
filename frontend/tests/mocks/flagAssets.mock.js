// Stands in for flagAssets.ts, which Jest cannot parse (`import.meta.glob`).
module.exports = {
  __esModule: true,
  flagUrl: (countryCode) =>
    countryCode ? `${String(countryCode).toUpperCase()}.svg` : undefined,
  default: {},
};

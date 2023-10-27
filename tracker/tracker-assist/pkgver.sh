sed -n 's/.*"version": *"\([^"]*\)".*/export const pkgVersion = "\1";/p' package.json > src/version.ts

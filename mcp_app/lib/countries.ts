import { countries } from './countriesList'

/**
 * Resolve a country input (name or code) to a 2-letter ISO code.
 * If input is already a 2-letter code, returns it uppercased.
 * Otherwise does a case-insensitive lookup against country names.
 * Falls back to returning the input as-is if no match found.
 */
export function resolveCountryValue(input: string): string {
  const upper = input.trim().toUpperCase();

  // Already a 2-letter code that exists in our map
  if (upper.length === 2 && countries[upper]) {
    return upper;
  }

  // Try to find by name (case-insensitive)
  const lower = input.trim().toLowerCase();
  for (const [code, name] of Object.entries(countries)) {
    if (name.toLowerCase() === lower) {
      return code;
    }
  }

  // Passthrough — let the API handle it
  return input;
}

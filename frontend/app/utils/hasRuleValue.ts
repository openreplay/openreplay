/** A filter rule, or one of its properties, has a value set. */
export function hasRuleValue(f: any): boolean {
  if (!f) return false;
  const own = (f.value ?? []).some((v: unknown) => v != null && v !== '');
  return own || (f.filters ?? []).some(hasRuleValue);
}

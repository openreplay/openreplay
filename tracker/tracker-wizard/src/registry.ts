/**
 * The version a plain install of `pkg` resolves to (`latest` dist-tag). Uses the registry
 * npm passes to npx through the environment; undefined when offline or slow.
 */
export async function latestVersion(pkg: string, timeoutMs = 4000): Promise<string | undefined> {
  const registry = (process.env.npm_config_registry || 'https://registry.npmjs.org').replace(
    /\/+$/,
    '',
  )
  try {
    const res = await fetch(`${registry}/${pkg.replace('/', '%2F')}/latest`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return undefined
    const version = ((await res.json()) as { version?: unknown })?.version
    return typeof version === 'string' ? version : undefined
  } catch {
    return undefined
  }
}

export type DiffLine = { kind: ' ' | '+' | '-'; text: string }

/** Line diff (LCS); files the wizard edits are small and the changes are insertions. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n')
  const b = after.split('\n')
  const n = a.length
  const m = b.length
  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      out.push({ kind: ' ', text: a[i] })
      i++
      j++
    } else if (j < m && (i === n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      out.push({ kind: '+', text: b[j++] })
    } else {
      out.push({ kind: '-', text: a[i++] })
    }
  }
  return out
}

/** Changed lines with `context` lines around them; `null` marks skipped stretches. */
export function hunks(lines: DiffLine[], context = 1): (DiffLine | null)[] {
  const keep = new Set<number>()
  lines.forEach((l, i) => {
    if (l.kind === ' ') return
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++)
      keep.add(k)
  })
  const out: (DiffLine | null)[] = []
  let last = -1
  for (let i = 0; i < lines.length; i++) {
    if (!keep.has(i)) continue
    if (last !== -1 && i !== last + 1) out.push(null)
    out.push(lines[i])
    last = i
  }
  return out
}

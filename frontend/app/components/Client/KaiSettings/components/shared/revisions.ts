import { StepChange, TestCase, TestVersion } from './types';

// Pure step-revision logic, kept out of the components so the diff rows, the apply
// result and the per-step history all derive from one place.

export const testVersion = (tc: TestCase): number => tc.version ?? 1;

export const needsReview = (tc: TestCase): boolean => !!tc.pendingRevision;

// One row of the review list — the current steps merged with the proposed changes,
// in the order the new version would read.
export interface ReviewRow {
  kind: 'kept' | 'added' | 'removed' | 'updated';
  /** display text — for `updated` this is the proposed text, `removed` the old step */
  text: string;
  /** `updated` only: what the step says today */
  oldText?: string;
  /** index into `pendingRevision.changes` (kept rows have none) */
  changeIdx?: number;
  /** index into the current `steps` (added rows have none) */
  stepIdx?: number;
}

/** Merge the current steps with the proposed changes into display order. */
export function buildReviewRows(
  steps: string[],
  changes: StepChange[],
): ReviewRow[] {
  const removed = new Map<number, number>(); // stepIdx → changeIdx
  const updated = new Map<number, number>();
  const added = new Map<number, number[]>(); // afterIndex → changeIdx[]
  changes.forEach((c, i) => {
    if (c.type === 'removed') removed.set(c.index, i);
    else if (c.type === 'updated') updated.set(c.index, i);
    else added.set(c.afterIndex, [...(added.get(c.afterIndex) ?? []), i]);
  });

  const rows: ReviewRow[] = [];
  const pushAdded = (after: number) =>
    (added.get(after) ?? []).forEach((changeIdx) => {
      const c = changes[changeIdx] as Extract<StepChange, { type: 'added' }>;
      rows.push({ kind: 'added', text: c.text, changeIdx });
    });

  pushAdded(-1);
  steps.forEach((step, stepIdx) => {
    if (removed.has(stepIdx)) {
      rows.push({
        kind: 'removed',
        text: step,
        changeIdx: removed.get(stepIdx),
        stepIdx,
      });
    } else if (updated.has(stepIdx)) {
      const changeIdx = updated.get(stepIdx)!;
      const c = changes[changeIdx] as Extract<StepChange, { type: 'updated' }>;
      rows.push({ kind: 'updated', text: c.text, oldText: step, changeIdx, stepIdx });
    } else {
      rows.push({ kind: 'kept', text: step, stepIdx });
    }
    pushAdded(stepIdx);
  });
  return rows;
}

/** The steps the new version would have, given which changes were discarded and any
 *  inline edits made to proposed rows (keyed by change index). */
export function resolveSteps(
  steps: string[],
  changes: StepChange[],
  discarded: Set<number>,
  edits: Map<number, string>,
): string[] {
  return buildReviewRows(steps, changes)
    .map((row) => {
      const off = row.changeIdx != null && discarded.has(row.changeIdx);
      switch (row.kind) {
        case 'kept':
          return row.text;
        case 'added':
          return off ? null : (edits.get(row.changeIdx!) ?? row.text);
        case 'removed':
          return off ? row.text : null; // discarding a removal keeps the step
        case 'updated':
          return off ? row.oldText! : (edits.get(row.changeIdx!) ?? row.text);
        default:
          return null;
      }
    })
    .filter((s): s is string => s != null && s.trim() !== '');
}

/** Commit a reviewed revision: steps become the resolved list, the old steps are
 *  snapshotted into history, and the pending revision clears. Status is untouched —
 *  an active test simply resumes its schedule. */
export function applyRevision(
  tc: TestCase,
  resolved: string[],
  savedAt: number,
): TestCase {
  const snapshot: TestVersion = {
    version: testVersion(tc),
    savedAt,
    steps: [...tc.steps],
  };
  return {
    ...tc,
    steps: resolved,
    version: tc.pendingRevision?.toVersion ?? testVersion(tc) + 1,
    history: [...(tc.history ?? []), snapshot],
    pendingRevision: undefined,
  };
}

/** Dismiss the proposal and stay on the current version. */
export function keepCurrentVersion(tc: TestCase): TestCase {
  return { ...tc, pendingRevision: undefined };
}

/** Restore an older snapshot — git-revert style: the restored steps become a NEW
 *  version (history only ever grows), so nothing is lost. */
export function restoreVersion(
  tc: TestCase,
  version: number,
  savedAt: number,
): TestCase {
  const snap = tc.history?.find((h) => h.version === version);
  if (!snap) return tc;
  const current: TestVersion = {
    version: testVersion(tc),
    savedAt,
    steps: [...tc.steps],
  };
  return {
    ...tc,
    steps: [...snap.steps],
    version: testVersion(tc) + 1,
    history: [...(tc.history ?? []), current],
  };
}

/** What a step said in earlier versions (same position, only where it differs) —
 *  newest first. Powers the subtle per-step history popover. */
export function stepHistory(
  tc: TestCase,
  stepIdx: number,
): { version: number; text: string }[] {
  const current = tc.steps[stepIdx];
  const out: { version: number; text: string }[] = [];
  for (const h of [...(tc.history ?? [])].sort((a, b) => b.version - a.version)) {
    const text = h.steps[stepIdx];
    if (text != null && text !== current && !out.some((o) => o.text === text))
      out.push({ version: h.version, text });
  }
  return out;
}

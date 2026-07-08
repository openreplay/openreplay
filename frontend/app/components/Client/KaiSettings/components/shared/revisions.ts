import { StepChange, TestCase, TestVersion } from './types';

// Pure step-revision logic, kept out of the components so the review rows, the
// resolved result and the per-step history all derive from one place.

export const testVersion = (tc: TestCase): number => tc.version ?? 1;

export const needsReview = (tc: TestCase): boolean => !!tc.pendingRevision;

// One row of the review list. During a review the whole list stays a live,
// editable step list (same as drafts) — proposed rows just carry a marker:
//  - kind 'added'   → proposed new step (green, git-style)
//  - kind 'removed' → proposed deletion (red background, struck)
//  - no kind        → a plain step (kept, or typed by the user during the review)
// Every marked row carries an explicit accept/reject pair. Suggestions arrive
// UNDECIDED — clicking ✓/✕ is a real action with visible feedback (clicking the same
// side again un-decides). On save, an undecided suggestion applies (the proposal
// stands unless rejected); 'rejected' flips it.
export type StepDecision = 'accepted' | 'rejected';
export interface StepItem {
  text: string;
  kind?: 'added' | 'removed';
  decision?: StepDecision;
}

/** Merge the current steps with the proposed changes into one editable list. */
export function buildReviewItems(
  steps: string[],
  changes: StepChange[],
): StepItem[] {
  const removed = new Set(
    changes.filter((c) => c.type === 'removed').map((c) => c.index),
  );
  const added = new Map<number, string[]>();
  changes.forEach((c) => {
    if (c.type === 'added')
      added.set(c.afterIndex, [...(added.get(c.afterIndex) ?? []), c.text]);
  });

  const out: StepItem[] = [];
  (added.get(-1) ?? []).forEach((text) => out.push({ text, kind: 'added' }));
  steps.forEach((text, i) => {
    out.push(removed.has(i) ? { text, kind: 'removed' } : { text });
    (added.get(i) ?? []).forEach((t) => out.push({ text: t, kind: 'added' }));
  });
  return out;
}

/** The steps the new version would have, given the reviewed (and freely edited)
 *  item list: plain rows stay, additions count and removals drop unless the
 *  suggestion was explicitly rejected. */
export function resolveItems(items: StepItem[]): string[] {
  return items
    .filter((it) =>
      it.kind === 'added'
        ? it.decision !== 'rejected'
        : it.kind === 'removed'
          ? it.decision === 'rejected'
          : true,
    )
    .map((it) => it.text)
    .filter((s) => s.trim() !== '');
}

/** A row that's leaving the test (a removal that stands, or a rejected addition) —
 *  rendered struck-through, not editable, not counted in the numbering. */
export const isStruck = (it: StepItem): boolean =>
  (it.kind === 'removed' && it.decision !== 'rejected') ||
  (it.kind === 'added' && it.decision === 'rejected');

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

/** What a step said in earlier versions (same position, only where it differs) —
 *  newest first. Powers the subtle per-step history popover. */
export function stepHistory(
  tc: TestCase,
  stepIdx: number,
): { version: number; text: string }[] {
  const current = tc.steps[stepIdx];
  const out: { version: number; text: string }[] = [];
  for (const h of [...(tc.history ?? [])].sort(
    (a, b) => b.version - a.version,
  )) {
    const text = h.steps[stepIdx];
    if (text != null && text !== current && !out.some((o) => o.text === text))
      out.push({ version: h.version, text });
  }
  return out;
}

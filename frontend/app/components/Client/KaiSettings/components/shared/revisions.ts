import { StepChange, TestCase } from './types';

// Pure step-revision logic, kept out of the components so the review rows and the
// resolved result derive from one place.

export const testVersion = (tc: TestCase): number => tc.version ?? 1;

/** The API `needsReview` flag can be set before a reviewable diff exists. */
export const needsReview = (tc: TestCase): boolean =>
  !!tc.needsReview || !!tc.pendingRevision;

// During a review the whole list stays a live, editable step list (same as drafts);
// proposed rows just carry a marker. Suggestions arrive UNDECIDED — clicking ✓/✕ is a
// real action (clicking the same side again un-decides). On save an undecided suggestion
// applies; 'rejected' flips it.
export type StepDecision = 'accepted' | 'rejected';
export interface StepItem {
  text: string;
  /** 'group' = a merge-review group label (text = the source test's title):
   *  unnumbered, not editable inline, and dragging it moves its whole block. */
  kind?: 'added' | 'removed' | 'group';
  /** Stable identity for group rows, so collapse state survives reordering and two
   *  sources sharing a title don't collapse as one. */
  id?: string;
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

/** The steps the new version would have: plain rows stay, additions count and removals
 *  drop unless the suggestion was explicitly rejected. */
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

/** A row leaving the test (a removal that stands, or a rejected addition) — rendered
 *  struck-through, not editable, not counted in the numbering. */
export const isStruck = (it: StepItem): boolean =>
  (it.kind === 'removed' && it.decision !== 'rejected') ||
  (it.kind === 'added' && it.decision === 'rejected');

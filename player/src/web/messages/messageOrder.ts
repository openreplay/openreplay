import type { PlayerMsg } from '../../common/types';
import { MType } from './raw.gen';

/**
 * Priority tiers for ordering messages within same-timestamp groups.
 * Uses bucket sort instead of comparator-based sort to avoid
 * native V8 TimSort transitivity issues on large (20k+) arrays.
 *
 * CREATE -> MODIFY -> DELETE
 */
export function getMsgPriority(tp: number): number {
  switch (tp) {
    case MType.CreateDocument:
      return 0;
    case MType.SetPageLocation:
    case MType.SetPageLocationDeprecated:
      return 1;
    case MType.CreateElementNode:
    case MType.CreateTextNode:
    case MType.CreateIFrameDocument:
      return 2;
    case MType.SetNodeAttribute:
    case MType.SetNodeAttributeURLBased:
    case MType.SetNodeAttributeDictGlobal:
    case MType.SetNodeAttributeDict:
    case MType.SetNodeAttributeDictDeprecated:
    case MType.RemoveNodeAttribute:
    case MType.SetNodeData:
    case MType.SetCssData:
    case MType.SetCssDataURLBased:
    case MType.SetNodeSlot:
    case MType.LoadFontFace:
    case MType.NodeAnimationResult:
      return 3;
    case MType.AdoptedSsAddOwner:
      return 4;
    case MType.AdoptedSsInsertRule:
    case MType.AdoptedSsInsertRuleURLBased:
    case MType.AdoptedSsReplace:
    case MType.AdoptedSsReplaceURLBased:
    case MType.AdoptedSsDeleteRule:
      return 5;
    case MType.MoveNode:
      return 6;
    case MType.RemoveNode:
    case MType.AdoptedSsRemoveOwner:
      return 8;
    default:
      return 7;
  }
}

const BUCKET_COUNT = 9;

export function needsSorting(
  msgs: PlayerMsg[],
  start: number,
  end: number,
): boolean {
  let maxPriority = -1;
  let lastCreateId = -1;
  for (let i = start; i < end; i++) {
    const p = getMsgPriority(msgs[i].tp);
    if (p < maxPriority) return true;
    maxPriority = p;
    if (p === 2) {
      const id = (msgs[i] as { id?: number }).id;
      if (id !== undefined) {
        if (id < lastCreateId) return true;
        lastCreateId = id;
      }
    }
  }
  return false;
}

export function sortTimeGroup(msgs: PlayerMsg[], start: number, end: number) {
  const buckets: PlayerMsg[][] = [];
  for (let b = 0; b < BUCKET_COUNT; b++) buckets.push([]);
  for (let i = start; i < end; i++) {
    buckets[getMsgPriority(msgs[i].tp)].push(msgs[i]);
  }
  if (buckets[2].length > 1) {
    buckets[2].sort(
      (a, b) =>
        ((a as { id?: number }).id ?? 0) - ((b as { id?: number }).id ?? 0),
    );
  }
  let idx = start;
  for (let b = 0; b < BUCKET_COUNT; b++) {
    const bucket = buckets[b];
    for (let j = 0; j < bucket.length; j++) {
      msgs[idx++] = bucket[j];
    }
  }
}

/**
 * Restore a replay-safe order on a batch of messages.
 *
 * Two passes:
 *  1. Stable sort by `time` so older events apply first.
 *  2. For each same-timestamp group, bucket-sort by `getMsgPriority` so the
 *     DOM lifecycle is respected: CreateDocument → SetPageLocation → node
 *     creations → attribute/data mutations → adoptedStyleSheet ops → moves →
 *     removals. Within the creation bucket, ties are broken by ascending node
 *     id so parents (lower ids, assigned earlier by the tracker's DFS bind)
 *     land before their children — otherwise an out-of-order batch can leave
 *     orphan inserts that silently drop entire subtrees from the replay.
 *
 * Uses bucket sort instead of a comparator-based sort to sidestep V8 TimSort's
 * transitivity issues on large (20k+) arrays.
 */
export function fixMessageOrder(msgs: PlayerMsg[]): PlayerMsg[] {
  msgs.sort((a, b) => a.time - b.time);

  let i = 0;
  while (i < msgs.length) {
    const time = msgs[i].time;
    let j = i + 1;
    while (j < msgs.length && msgs[j].time === time) j++;

    if (j - i > 1 && needsSorting(msgs, i, j)) {
      sortTimeGroup(msgs, i, j);
    }

    i = j;
  }

  return msgs;
}

export function sortIframes(m1, m2) {
  if (
    m1.time === m2.time &&
    [MType.CreateIFrameDocument, MType.CreateElementNode].includes(m1.tp) &&
    [MType.CreateIFrameDocument, MType.CreateElementNode].includes(m2.tp)
  ) {
    if (m1.frameID === m2.id) return 1;
    if (m1.id === m2.frameID) return -1;
  }
  return 0;
}

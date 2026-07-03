import { Tooltip } from 'antd';
import { Minus, Undo2, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ReviewRow, buildReviewRows } from '../shared/revisions';
import { PendingRevision } from '../shared/types';
import { Section } from './EntityDrawer';

// proposed-change tint — a softer cousin of the editing row's blue, so "proposed"
// and "editing" read as the same family without being confusable
const PROPOSED_BG = 'rgba(57, 78, 255, 0.06)';

interface Props {
  steps: string[];
  revision: PendingRevision;
  fromVersion: number;
  /** change indices the user turned off (keep as-is instead of the proposal) */
  discarded: Set<number>;
  /** inline edits to proposed rows, keyed by change index */
  edits: Map<number, string>;
  onToggle: (changeIdx: number) => void;
  onEdit: (changeIdx: number, text: string) => void;
}

/** The v(N) → v(N+1) step diff, in the exact visual language of EditableSteps: same
 *  rows, numbers and type — added steps tint blue, removed steps strike through,
 *  updated steps carry their old wording underneath. Every change arrives applied;
 *  the ✕ on a row keeps that step as-is instead (↺ re-applies the proposal). */
function ReviewSteps({
  steps,
  revision,
  fromVersion,
  discarded,
  edits,
  onToggle,
  onEdit,
}: Props) {
  const { t } = useTranslation();
  const rows = buildReviewRows(steps, revision.changes);

  const applied = revision.changes.length - discarded.size;
  const summary =
    discarded.size === 0
      ? `${revision.changes.length} ${revision.changes.length === 1 ? t('change') : t('changes')}`
      : `${applied} ${t('of')} ${revision.changes.length} ${t('changes applied')}`;

  // live numbering over the steps the new version would actually have
  let n = 0;
  const numberFor = (row: ReviewRow): number | null => {
    const off = row.changeIdx != null && discarded.has(row.changeIdx);
    const exists =
      row.kind === 'kept' ||
      row.kind === 'updated' ||
      (row.kind === 'added' && !off) ||
      (row.kind === 'removed' && off);
    if (!exists) return null;
    n += 1;
    return n;
  };

  return (
    <Section
      title={`${t('Steps')} · V${fromVersion} → V${revision.toVersion}`}
      action={<span className="text-sm text-disabled-text">{summary}</span>}
    >
      <div className="flex flex-col max-h-[50vh] overflow-y-auto overscroll-contain pr-1">
        {rows.map((row, i) => (
          <Row
            key={i}
            row={row}
            number={numberFor(row)}
            off={row.changeIdx != null && discarded.has(row.changeIdx)}
            editedText={
              row.changeIdx != null ? edits.get(row.changeIdx) : undefined
            }
            onToggle={onToggle}
            onEdit={onEdit}
          />
        ))}
      </div>
    </Section>
  );
}

function Row({
  row,
  number,
  off,
  editedText,
  onToggle,
  onEdit,
}: {
  row: ReviewRow;
  number: number | null;
  off: boolean;
  editedText?: string;
  onToggle: (changeIdx: number) => void;
  onEdit: (changeIdx: number, text: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const skipBlur = useRef(false);

  const changed = row.kind !== 'kept';
  const proposedOn = changed && !off;
  const text = editedText ?? row.text;
  // a removed step that's ON will be deleted; an added step that's OFF won't exist —
  // both render struck-through (they're the rows leaving the test)
  const struck =
    (row.kind === 'removed' && !off) || (row.kind === 'added' && off);
  const tinted =
    (row.kind === 'added' || row.kind === 'updated') && proposedOn;
  const editable = tinted && row.changeIdx != null;

  const startEdit = () => {
    if (!editable) return;
    setDraft(text);
    setEditing(true);
  };
  const commit = () => {
    const v = draft.trim();
    if (v && v !== row.text) onEdit(row.changeIdx!, v);
    setEditing(false);
  };

  const toggleTip = !changed
    ? undefined
    : row.kind === 'added'
      ? off
        ? t('Restore this new step')
        : t('Don’t add this step')
      : row.kind === 'removed'
        ? off
          ? t('Remove this step')
          : t('Keep this step')
        : off
          ? t('Use the new wording')
          : t('Keep the old wording');

  return (
    <div
      className="group flex items-start gap-2.5 rounded px-1 -mx-1 py-1.5"
      style={tinted ? { background: PROPOSED_BG } : undefined}
    >
      {/* number slot — mirrors EditableSteps; steps leaving the test show a red − */}
      <span className="w-5 h-6 flex items-center justify-center shrink-0 leading-6">
        {struck ? (
          <Minus size={14} className="text-red" />
        ) : (
          <span
            className="text-sm"
            style={{
              color:
                row.kind === 'added' && proposedOn
                  ? 'var(--color-main)'
                  : 'var(--color-disabled-text, rgba(0,0,0,.38))',
            }}
          >
            {number}
          </span>
        )}
      </span>

      <span className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            aria-label={t('Edit step')}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (skipBlur.current) {
                skipBlur.current = false;
                return;
              }
              commit();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                skipBlur.current = true;
                commit();
              } else if (e.key === 'Escape') {
                skipBlur.current = true;
                setEditing(false);
              }
            }}
            className="w-full text-[15px] leading-6 bg-transparent outline-none border-0 p-0 m-0 text-black"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className={`block w-full text-left text-[15px] leading-6 break-words ${
              struck ? 'line-through text-disabled-text' : ''
            } ${editable ? '' : 'cursor-default'}`}
          >
            {text}
          </button>
        )}
        {/* updated: the other wording rides underneath, whichever way the toggle points */}
        {row.kind === 'updated' && (
          <span className="block text-xs text-disabled-text line-through break-words">
            {off ? editedText ?? row.text : row.oldText}
          </span>
        )}
      </span>

      {changed && !editing && (
        <Tooltip title={toggleTip}>
          <button
            type="button"
            aria-label={toggleTip}
            onClick={() => onToggle(row.changeIdx!)}
            className="shrink-0 self-start w-6 h-6 rounded flex items-center justify-center text-gray-medium hover:text-gray-darkest hover:bg-gray-lightest"
          >
            {off ? <Undo2 size={14} /> : <X size={14} />}
          </button>
        </Tooltip>
      )}
    </div>
  );
}

export default ReviewSteps;

import React from 'react';
import { Tooltip, Avatar, Input, Button, Popover, Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { AlertTriangle, X } from 'lucide-react';
import { Icon } from 'UI';
import {
  type Issue,
  type CategoryName,
  CAT_ICON,
  CRITICAL_REASONS,
  impactLevel,
  IMPACT_FILLED,
  IMPACT_COLOR,
  lastSeenLabel,
} from 'App/mstore/issuesStore';

/* AiSummary — the reusable "what happened" AI textbox (Mehdi: a component to
   highlight what happened). Two variants:
   - primary: the full AI card (tinted surface + "AI summary" label). Used for
     the issue description, the most important block on the page.
   - secondary: just the AI text with a small sparkles mark, no surface. Used for
     each session's plain-language description. */
export function AiSummary({
  children,
  variant = 'primary',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  if (variant === 'secondary') {
    return (
      <div
        className="flex items-start gap-1.5 text-sm"
        style={{ color: 'var(--color-gray-dark)', lineHeight: 1.55 }}
      >
        <Icon
          name="sparkles"
          size={13}
          className="shrink-0"
          style={{ marginTop: 3 }}
        />
        <div>{children}</div>
      </div>
    );
  }
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1.5"
      style={{
        background: 'linear-gradient(156deg, #F3F4FF 0%, #F1F8F8 100%)',
        border: '1px solid var(--color-gray-light)',
      }}
    >
      <span className="inline-flex items-center gap-1.5">
        <Icon name="sparkles" size={14} />
        <span className="text-xs font-semibold text-main">AI summary</span>
      </span>
      <div style={{ color: 'var(--color-gray-dark)', lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  );
}

/* Impact as a horizontal three-level connected meter — one rounded pill split
   into three parts, lit by level. Shared by the issues list and the detail
   header so the two never drift. */
export function ImpactGauge({ value }: { value: number }) {
  const level = impactLevel(value);
  const filled = IMPACT_FILLED[level];
  const color = IMPACT_COLOR[level];
  return (
    <span
      className="inline-flex"
      style={{
        width: 38,
        height: 3,
        borderRadius: 2,
        overflow: 'hidden',
        gap: 1,
        background: '#fff',
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            flex: 1,
            background:
              i < filled
                ? color
                : 'color-mix(in srgb, var(--color-gray-light) 55%, white)',
          }}
        />
      ))}
    </span>
  );
}

/* Category as the teal circle + icon used on the Cards list (MetricListItem):
   an antd Avatar with the tealx-lightest fill and a tealx icon. */
export function CategoryLabel({ cat }: { cat: CategoryName }) {
  const Ic = CAT_ICON[cat];
  return (
    <span className="inline-flex items-center" style={{ gap: 8 }}>
      <Avatar
        size="default"
        className="bg-tealx-lightest"
        icon={<Ic size={16} strokeWidth={2} style={{ color: '#3EAAAF' }} />}
      />
      <span className="text-sm" style={{ color: 'var(--color-gray-darkest)' }}>
        {cat}
      </span>
    </span>
  );
}

/* Inline rename — same interaction as Data Management's EditableField: a pencil
   appears on hover; editing shows a small input with Cancel / Save buttons. */
function EditableTitle({
  value,
  onSave,
}: {
  value: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(value);
  const ref = React.useRef<any>(null);

  React.useEffect(() => setName(value), [value]);
  React.useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const save = () => {
    const v = name.trim();
    if (v) onSave(v);
    setEditing(false);
  };
  const cancel = () => {
    setName(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={ref}
          size="small"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={save}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel();
          }}
          style={{ width: 320 }}
        />
        <Button size="small" type="text" onClick={cancel}>
          Cancel
        </Button>
        <Button size="small" type="primary" onClick={save}>
          Save
        </Button>
      </div>
    );
  }
  return (
    <Tooltip mouseEnterDelay={0.4} title="Click to edit">
      <div
        onClick={() => setEditing(true)}
        className="group flex items-center gap-2 cursor-pointer select-none rounded-lg px-2 -mx-2 py-1 hover:bg-teal/10 transition"
      >
        <span
          className="text-xl font-semibold"
          style={{ color: 'var(--color-gray-darkest)', lineHeight: 1.3 }}
        >
          {value}
        </span>
        <span className="text-main opacity-0 group-hover:opacity-100 transition-opacity">
          <EditOutlined />
        </span>
      </div>
    </Tooltip>
  );
}

/* Selectable reason chip — same component/look as the Sessions filter pills:
   an antd Button (size small) that toggles default (gray) → primary (selected).
   Shared by the hide and remove-critical reason pickers. */
export function ReasonChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Button
      size="small"
      type="default"
      onClick={() => onChange(!checked)}
      style={
        checked
          ? {
              background: 'var(--color-active-blue)',
              borderColor: 'var(--color-active-blue-border)',
              color: 'var(--color-teal)',
            }
          : undefined
      }
    >
      {label}
    </Button>
  );
}

/* Tag content kept on a single line: alert-triangle + label (+ optional close
   affordance). The whole tag is the click target, so the × opens the popover. */
const critContent = (text: string, withClose = false) => (
  <span className="inline-flex items-center gap-1">
    <AlertTriangle size={12} strokeWidth={2} style={{ fill: 'none' }} />
    <span>{text}</span>
    {withClose && <X size={12} style={{ marginLeft: 2, opacity: 0.65 }} />}
  </span>
);

/* The critical flag on the detail page, built on antd Tag (red, same
   AlertTriangle as the issues list). With `onSet` it's a two-way toggle:
   marking is instant and personal-only (Mehdi 07-07). Removal depends on the
   flag's source — `personalOnly` (my mark, no agent flag) removes instantly
   and silently; an agent flag opens the "why" reason popover, since that
   removal is for everyone and teaches the agent. Without `onSet` it's a
   static red tag. */
function CriticalControl({
  critical,
  personalOnly,
  onSet,
}: {
  critical: boolean;
  /** the flag has no agent/project source — it exists only in my layer */
  personalOnly?: boolean;
  onSet?: (val: boolean, reason?: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [reasons, setReasons] = React.useState<string[]>([]);
  const [note, setNote] = React.useState('');

  if (!critical) {
    if (!onSet) return null;
    return (
      <Tooltip title="Mark critical for me">
        <Tag
          bordered
          onClick={() => onSet(true)}
          className="crit-tag cursor-pointer"
          style={{ margin: 0, color: 'var(--color-gray-medium)' }}
        >
          {critContent('Mark critical')}
        </Tag>
      </Tooltip>
    );
  }

  if (!onSet) {
    return (
      <Tag color="red" bordered style={{ margin: 0 }}>
        {critContent('Critical')}
      </Tag>
    );
  }

  if (personalOnly) {
    return (
      <Tooltip title="Remove from my criticals">
        <Tag
          color="red"
          bordered
          onClick={() => onSet(false)}
          className="crit-tag cursor-pointer"
          style={{ margin: 0 }}
        >
          {critContent('Critical for me', true)}
        </Tag>
      </Tooltip>
    );
  }

  const panel = (
    <div className="flex flex-col gap-2" style={{ width: 264 }}>
      <span className="text-sm" style={{ color: 'var(--color-gray-dark)' }}>
        Removes the flag for everyone. Why isn’t it critical?
      </span>
      <div className="flex flex-wrap gap-1.5">
        {CRITICAL_REASONS.map((t) => (
          <ReasonChip
            key={t}
            label={t}
            checked={reasons.includes(t)}
            onChange={(on) =>
              setReasons((p) => (on ? [...p, t] : p.filter((x) => x !== t)))
            }
          />
        ))}
      </div>
      <Input.TextArea
        rows={2}
        placeholder="Add a note (optional)…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button size="small" type="text" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="small"
          type="primary"
          danger
          onClick={() => {
            onSet(false, [...reasons, note.trim()].filter(Boolean).join(' · '));
            setOpen(false);
            setReasons([]);
            setNote('');
          }}
        >
          Mark as not critical
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      content={panel}
    >
      <Tag
        color="red"
        bordered
        className="crit-tag cursor-pointer"
        style={{ margin: 0 }}
      >
        {critContent('Critical', true)}
      </Tag>
    </Popover>
  );
}

interface Props {
  issue: Issue;
  /** when set, the title is click-to-rename (issue detail page) */
  editable?: boolean;
  onRename?: (name: string) => void;
  /** when set, the Critical chip becomes a two-way toggle (issue detail page) */
  onSetCritical?: (val: boolean, reason?: string) => void;
  /** the critical flag exists only in my personal layer (no agent flag) —
      removal is instant instead of the teaching popover */
  criticalPersonalOnly?: boolean;
  /** right-aligned actions on the title row (e.g. Create ticket / Hide) */
  actions?: React.ReactNode;
  /** detail-page framing: title+actions header, full-width divider, then body */
  framed?: boolean;
  /** hide the "The problem" diagnosis (e.g. when it's shown in its own tab) */
  hideProblem?: boolean;
}

function ProblemCard({
  issue,
  editable,
  onRename,
  onSetCritical,
  criticalPersonalOnly,
  actions,
  framed,
  hideProblem,
}: Props) {
  const level = impactLevel(issue.impact);

  const title =
    editable && onRename ? (
      <EditableTitle value={issue.head} onSave={onRename} />
    ) : (
      <span
        className="text-xl font-semibold"
        style={{ color: 'var(--color-gray-darkest)', lineHeight: 1.3 }}
      >
        {issue.head}
      </span>
    );

  const meta = (
    <div
      className="flex items-center gap-3 text-sm flex-wrap"
      style={{ color: 'var(--color-gray-medium)' }}
    >
      <CategoryLabel cat={issue.cat} />
      <span style={{ color: 'var(--color-gray-light)' }}>|</span>
      <Tooltip title={`${level} impact`}>
        <span className="inline-flex items-center cursor-default">
          <ImpactGauge value={issue.impact} />
        </span>
      </Tooltip>
      {(onSetCritical || issue.critical) && (
        <>
          <span style={{ color: 'var(--color-gray-light)' }}>|</span>
          <CriticalControl
            critical={issue.critical}
            personalOnly={criticalPersonalOnly}
            onSet={onSetCritical}
          />
        </>
      )}
      <span style={{ color: 'var(--color-gray-light)' }}>|</span>
      <span className="whitespace-nowrap">
        last seen {lastSeenLabel(issue.seenAgoMin)}
      </span>
    </div>
  );

  const diagnosis = (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-xs font-semibold uppercase"
        style={{ color: 'var(--color-gray-medium)', letterSpacing: '0.05em' }}
      >
        The problem
      </span>
      <span
        className="text-base"
        style={{ color: 'var(--color-gray-dark)', lineHeight: 1.6 }}
      >
        {issue.real}
      </span>
    </div>
  );

  if (framed) {
    return (
      <div className="flex flex-col">
        {/* header: title + actions, split from the rest by a full-width divider */}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">{title}</div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
        <div className="border-b" />
        <div className="px-4 py-4 flex flex-col gap-4">
          {meta}
          {diagnosis}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">{title}</div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
        {meta}
      </div>
      {!hideProblem && diagnosis}
    </div>
  );
}

export default ProblemCard;

import React from 'react';
import { Button, Dropdown, Popover, Segmented, Switch, Tooltip, message } from 'antd';
import {
  ChevronDown,
  EllipsisVertical,
  Globe,
  Info,
  Pencil,
  Plus,
  Split,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import type { TrafficSegment } from 'App/mstore/issuesStore';
import SegmentDrawer from './SegmentDrawer';

/* The Traffic Segments entry point (Mehdi 07-07): a live mode pill by the
   "Issues" title — which capture mode am I in, readable on page load. Blue +
   animated in segments mode, neutral in full traffic. Clicking it opens the
   popover: the big capture-mode toggle on top (segments REPLACE full traffic),
   then the segment list — Yours / Team, a switch per segment (anyone can
   toggle: it's the project's shared capture setting), edit/delete on your own,
   + New segment. */

const FELL_BACK_MSG =
  'No active segments left — capture switched to full traffic.';

/* Tiny mode cue by the "Issues" title — which mode am I in, on page load,
   without eating header space. Same 22px chip form as the origin chips in the
   rows; in segments mode a soft ring pulses outward. Clicking flips the
   capture mode (the same shared setting as the dropdown's big toggle); with
   no active segment there is nothing to capture, so the click explains
   instead of switching. */
export const CaptureModeBadge = observer(() => {
  const { issuesStore } = useStore();
  const segmentsMode = issuesStore.captureMode === 'segments';
  const activeCount = issuesStore.activeSegmentCount;
  const canSegment = activeCount > 0;

  const flip = () => {
    if (segmentsMode) {
      issuesStore.setCaptureMode('full');
    } else if (canSegment) {
      issuesStore.setCaptureMode('segments');
    } else {
      message.info(
        'Turn on at least one segment first — see Traffic Segments on the right.',
      );
    }
  };

  return (
    <Tooltip
      placement="bottom"
      title={
        segmentsMode
          ? `Capturing only active segments (${activeCount}) — click for full traffic`
          : canSegment
            ? 'Capturing full traffic — click to capture only active segments'
            : 'Capturing full traffic — create a segment under Traffic Segments to capture less'
      }
    >
      <button
        type="button"
        onClick={flip}
        aria-pressed={segmentsMode}
        aria-label={`Capture mode: ${segmentsMode ? 'segments' : 'full traffic'} — click to switch`}
        // backgrounds + hover live in issues.css (.capture-badge) — per-mode
        // hover needs to win over the resting background; the "alive" cue in
        // segments mode is the outward ring pulse (seg-live-border)
        className={`capture-badge rounded-md border flex items-center justify-center shrink-0 cursor-pointer${segmentsMode ? ' seg-live-border' : ''}`}
        style={{
          width: 22,
          height: 22,
          padding: 0,
          borderColor: segmentsMode
            ? 'rgba(57, 78, 255, 0.6)'
            : 'var(--color-gray-light)',
          color: segmentsMode ? 'var(--color-main)' : 'var(--color-gray-medium)',
        }}
      >
        {segmentsMode ? <Split size={13} /> : <Globe size={13} />}
      </button>
    </Tooltip>
  );
});

function SegmentRow({
  segment,
  onEdit,
}: {
  segment: TrafficSegment;
  onEdit: (s: TrafficSegment) => void;
}) {
  const { issuesStore } = useStore();
  // row meta = the traffic % only (Mehdi 07-07: "the 2%, that's it");
  // the query summary and author stay one hover away
  const tip = segment.mine
    ? segment.summary
    : `${segment.summary} · by ${segment.createdBy}`;
  return (
    <div className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg group hover:bg-gray-lightest transition-colors">
      <Tooltip title={tip} placement="left">
        <span
          className="text-sm font-medium truncate min-w-0 flex-1 cursor-default"
          style={{
            color: segment.active
              ? 'var(--color-gray-darkest)'
              : 'var(--color-gray-dark)',
          }}
        >
          {segment.name}
        </span>
      </Tooltip>

      <span
        className="text-sm tabular-nums shrink-0"
        style={{ color: 'var(--color-gray-dark)' }}
      >
        ~{segment.trafficPct}%
      </span>

      <Switch
        size="small"
        checked={segment.active}
        aria-label={`${segment.name} — ${segment.active ? 'on' : 'off'}`}
        onChange={(on) => {
          if (issuesStore.toggleSegment(segment.id, on))
            message.info(FELL_BACK_MSG);
        }}
      />

      {/* far-right actions slot — constant width so every switch shares one edge */}
      <span className="w-6 shrink-0 flex items-center justify-center">
        {segment.mine && (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                { key: 'edit', icon: <Pencil size={14} />, label: 'Edit' },
                { type: 'divider' as const },
                {
                  key: 'delete',
                  icon: <Trash2 size={14} />,
                  label: 'Delete',
                  danger: true,
                },
              ],
              onClick: ({ key }) => {
                if (key === 'edit') onEdit(segment);
                else if (key === 'delete') {
                  if (issuesStore.deleteSegment(segment.id))
                    message.info(FELL_BACK_MSG);
                }
              },
            }}
          >
            <button
              type="button"
              aria-label="Segment actions"
              className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-gray-medium)' }}
            >
              <EllipsisVertical size={15} />
            </button>
          </Dropdown>
        )}
      </span>
    </div>
  );
}

function SegmentsIndicator() {
  const { issuesStore } = useStore();
  const [open, setOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TrafficSegment | null>(null);

  const mine = issuesStore.segments.filter((s) => s.mine);
  const team = issuesStore.segments.filter((s) => !s.mine);
  const activeCount = issuesStore.activeSegmentCount;
  const segmentsMode = issuesStore.captureMode === 'segments';

  const startCreate = () => {
    setEditing(null);
    setOpen(false);
    setDrawerOpen(true);
  };
  const startEdit = (s: TrafficSegment) => {
    setEditing(s);
    setOpen(false);
    setDrawerOpen(true);
  };

  const sectionTitle = (label: string) => (
    <div
      className="text-[11px] font-medium uppercase tracking-wider mt-3 mb-0.5"
      style={{ color: 'var(--color-gray-medium)' }}
    >
      {label}
    </div>
  );

  const content = (
    <div className="flex flex-col" style={{ width: 340 }}>
      {/* header — title + what this thing does */}
      <div className="pb-2.5 border-b -mx-1 px-1">
        <div className="flex items-center gap-1.5">
          <span
            className="text-base font-semibold"
            style={{ color: 'var(--color-gray-darkest)' }}
          >
            Traffic Segments
          </span>
          <Tooltip
            placement="bottom"
            title="Choose what the agent captures: the full traffic sample, or only sessions matching your active segments. Anyone can switch — it's the project's shared capture setting."
          >
            <span
              className="flex items-center cursor-help"
              style={{ color: 'var(--color-gray-medium)' }}
            >
              <Info size={14} />
            </span>
          </Tooltip>
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-gray-medium)' }}>
          Capture everything, or only the traffic you care about.
        </div>
      </div>

      {/* the big capture-mode toggle — segments REPLACE full traffic */}
      <div className="mt-3 flex flex-col gap-1.5">
        <Segmented
          block
          value={issuesStore.captureMode}
          onChange={(v) => issuesStore.setCaptureMode(v as 'full' | 'segments')}
          options={[
            {
              value: 'full',
              label: (
                <span className="flex items-center justify-center gap-1.5 py-0.5">
                  <Globe size={14} /> Full traffic
                </span>
              ),
            },
            {
              value: 'segments',
              disabled: activeCount === 0,
              label: (
                <span className="flex items-center justify-center gap-1.5 py-0.5">
                  <Split size={14} /> Segments
                </span>
              ),
            },
          ]}
        />
        <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
          {segmentsMode
            ? 'Only sessions matching active segments are captured.'
            : activeCount === 0
              ? 'Turn on a segment to enable segment capture.'
              : 'The agent samples across all traffic. Active segments apply when you switch.'}
        </span>
      </div>

      {issuesStore.segments.length === 0 ? (
        <div className="text-sm py-3" style={{ color: 'var(--color-gray-medium)' }}>
          No segments yet — the agent captures the full traffic sample. Create
          one to capture only the part you care about.
        </div>
      ) : (
        <>
          {mine.length > 0 && sectionTitle('Yours')}
          {mine.map((s) => (
            <SegmentRow key={s.id} segment={s} onEdit={startEdit} />
          ))}
          {team.length > 0 && sectionTitle('Team')}
          {team.map((s) => (
            <SegmentRow key={s.id} segment={s} onEdit={startEdit} />
          ))}
        </>
      )}

      <div className="border-t mt-2.5 pt-2 -mx-1 px-1">
        <Button
          type="text"
          icon={<Plus size={15} />}
          onClick={startCreate}
          className="w-full"
        >
          New segment
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement="bottomRight"
        content={content}
      >
        {/* the management dropdown — a plain trigger button like Tags/Display
            (border, native hover, chevron). The label states the mode; the
            blue "live" signal belongs to CaptureModeBadge by the title alone */}
        <Button
          size="small"
          icon={segmentsMode ? <Split size={14} /> : <Globe size={14} />}
          aria-label={`Capture mode: ${segmentsMode ? `${activeCount} segments` : 'full traffic'}`}
        >
          {segmentsMode
            ? `${activeCount} segment${activeCount === 1 ? '' : 's'}`
            : 'Full traffic'}
          <ChevronDown size={13} style={{ marginLeft: 2, opacity: 0.6 }} />
        </Button>
      </Popover>

      <SegmentDrawer
        open={drawerOpen}
        segment={editing}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

export default observer(SegmentsIndicator);

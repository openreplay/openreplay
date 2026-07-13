import React from 'react';
import { Button, Dropdown, Input, Popover, Segmented, Switch, Tooltip, message } from 'antd';
import {
  ChevronDown,
  ChevronLeft,
  EllipsisVertical,
  Globe,
  Info,
  ListX,
  Lock,
  Pencil,
  Plus,
  Search,
  Split,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import type { SavedSegment } from 'App/mstore/issuesStore';
import SegmentDrawer from './SegmentDrawer';
import { estimateFromSeeds } from './segmentUtils';
import './captureSwitch.css';

/* The Traffic Segments entry point (Gabriel 07-13): ONE pill by the "Issues"
   title that is both the on/off control and the door to settings — a real
   Switch flips capture mode in place, clicking the rest of the pill opens
   this management popover. It deliberately does NOT live in the filter row:
   capture is a project-wide setting, not a view filter, and sitting next to
   Tags/Display made it read as one. The popover has two views:
   · main — the big capture-mode toggle (segments REPLACE full traffic), then
     the capture set: Yours / Team, a switch per segment (anyone can toggle:
     it's the project's shared capture setting), edit/remove/delete on your
     own, "Add segment" at the bottom;
   · picker — "Add segment" swaps the content in place (back arrow): existing
     segments to enable. Segments = the same saved segments Data Management
     lists; only team-visible ones are eligible (everyone must be able to stop
     a capture), private ones show locked. "New segment" opens the shared
     create drawer. */

const FELL_BACK_MSG =
  'No active segments left — capture switched to full traffic.';

function SegmentRow({
  segment,
  onEdit,
}: {
  segment: SavedSegment;
  onEdit: (s: SavedSegment) => void;
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
                {
                  // NOT about stopping capture (the row switch does that) —
                  // this just declutters: the saved segment lives on in
                  // Data Management and can be re-added via "Add segment"
                  key: 'remove',
                  icon: <ListX size={14} />,
                  label: 'Remove from list',
                },
                { type: 'divider' as const },
                {
                  key: 'delete',
                  icon: <Trash2 size={14} />,
                  label: 'Delete segment',
                  danger: true,
                },
              ],
              onClick: ({ key }) => {
                if (key === 'edit') onEdit(segment);
                else if (key === 'remove') {
                  if (issuesStore.removeFromTraffic(segment.id))
                    message.info(FELL_BACK_MSG);
                } else if (key === 'delete') {
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

/** picker row — an existing saved segment that can be pulled into capture */
function CandidateRow({
  segment,
  onEnable,
}: {
  segment: SavedSegment;
  onEnable: (s: SavedSegment) => void;
}) {
  const eligible = segment.isPublic;
  const row = (
    <div
      role={eligible ? 'button' : undefined}
      onClick={eligible ? () => onEnable(segment) : undefined}
      className={`flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg transition-colors${
        eligible ? ' cursor-pointer hover:bg-gray-lightest group' : ''
      }`}
      style={eligible ? undefined : { opacity: 0.55 }}
    >
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-medium truncate" style={{ color: 'var(--color-gray-darkest)' }}>
          {segment.name}
        </span>
        <span className="text-xs truncate" style={{ color: 'var(--color-gray-medium)' }}>
          {segment.summary}
          {!segment.mine && ` · by ${segment.createdBy}`}
        </span>
      </div>
      {eligible ? (
        <span
          className="shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-main)' }}
        >
          <Plus size={15} />
        </span>
      ) : (
        <span className="shrink-0 flex items-center" style={{ color: 'var(--color-gray-medium)' }}>
          <Lock size={13} />
        </span>
      )}
    </div>
  );
  return eligible ? (
    row
  ) : (
    <Tooltip
      title="Private — only team-visible segments can capture traffic (everyone must be able to stop them). Make it team-visible in Data Management first."
      placement="left"
    >
      {row}
    </Tooltip>
  );
}

function SegmentsIndicator() {
  const { issuesStore } = useStore();
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<'main' | 'picker'>('main');
  const [pickerQuery, setPickerQuery] = React.useState('');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SavedSegment | null>(null);

  const traffic = issuesStore.trafficSegments;
  const mine = traffic.filter((s) => s.mine);
  const team = traffic.filter((s) => !s.mine);
  const activeCount = issuesStore.activeSegmentCount;
  const segmentsMode = issuesStore.captureMode === 'segments';

  // every visible-to-me segment not yet in the capture set; eligible (team)
  // ones first, private ones locked at the bottom as a teaching moment
  const q = pickerQuery.trim().toLowerCase();
  const candidates = issuesStore.segments
    .filter((s) => (s.isPublic || s.mine) && !s.isTrafficSegment)
    .filter((s) => !q || s.name.toLowerCase().includes(q))
    .sort((a, b) => Number(b.isPublic) - Number(a.isPublic));

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setView('main');
      setPickerQuery('');
    }
  };

  const startCreate = () => {
    setEditing(null);
    setOpen(false);
    setDrawerOpen(true);
  };
  const startEdit = (s: SavedSegment) => {
    setEditing(s);
    setOpen(false);
    setDrawerOpen(true);
  };

  // enabling an existing segment recomputes its estimate from the live pool
  const enable = (s: SavedSegment) => {
    issuesStore.enableTraffic(s.id, estimateFromSeeds(s.seeds));
    setView('main');
    setPickerQuery('');
    message.success(`${s.name} added to traffic segments.`);
  };

  const sectionTitle = (label: string) => (
    <div
      className="text-[11px] font-medium uppercase tracking-wider mt-3 mb-0.5"
      style={{ color: 'var(--color-gray-medium)' }}
    >
      {label}
    </div>
  );

  const mainView = (
    <>
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

      {traffic.length === 0 ? (
        <div className="text-sm py-3" style={{ color: 'var(--color-gray-medium)' }}>
          No traffic segments yet — the agent captures the full traffic sample.
          Add one to capture only the part you care about.
        </div>
      ) : (
        /* in Full traffic mode the capture set is dormant — fade the list so
           it reads as "takes effect when you pick Segments" (still editable:
           you can stage the set before switching) */
        <div
          className={`transition-opacity duration-200${segmentsMode ? '' : ' opacity-50'}`}
        >
          {mine.length > 0 && sectionTitle('Yours')}
          {mine.map((s) => (
            <SegmentRow key={s.id} segment={s} onEdit={startEdit} />
          ))}
          {team.length > 0 && sectionTitle('Team')}
          {team.map((s) => (
            <SegmentRow key={s.id} segment={s} onEdit={startEdit} />
          ))}
        </div>
      )}

      <div className="border-t mt-2.5 pt-2 -mx-1 px-1">
        <Button
          type="text"
          icon={<Plus size={15} />}
          onClick={() => setView('picker')}
          className="w-full"
        >
          Add segment
        </Button>
      </div>
    </>
  );

  const pickerView = (
    <>
      {/* back header — same in-place swap pattern as antd cascaded panels */}
      <div className="flex items-center gap-1 pb-2.5 border-b -mx-1 px-1">
        <Button
          type="text"
          size="small"
          icon={<ChevronLeft size={15} />}
          onClick={() => setView('main')}
          aria-label="Back"
          className="px-1!"
        />
        <span className="text-base font-semibold" style={{ color: 'var(--color-gray-darkest)' }}>
          Add segment
        </span>
      </div>

      <div className="mt-2.5">
        <Input
          size="small"
          allowClear
          autoFocus
          placeholder="Search segments"
          prefix={<Search size={14} style={{ color: 'var(--color-gray-medium)', marginRight: 2 }} />}
          value={pickerQuery}
          onChange={(e) => setPickerQuery(e.target.value)}
        />
      </div>

      <div className="overflow-y-auto mt-1 -mx-1 px-1" style={{ maxHeight: 264 }}>
        {candidates.length ? (
          candidates.map((s) => (
            <CandidateRow key={s.id} segment={s} onEnable={enable} />
          ))
        ) : (
          <div className="text-sm px-1 py-3" style={{ color: 'var(--color-gray-medium)' }}>
            {q
              ? `No segments match “${pickerQuery}”`
              : 'Every existing segment is already capturing — create a new one below.'}
          </div>
        )}
      </div>

      <div className="border-t mt-2 pt-2 -mx-1 px-1">
        <Button
          type="text"
          icon={<Plus size={15} />}
          onClick={startCreate}
          className="w-full"
        >
          Create new
        </Button>
      </div>
    </>
  );

  const content = (
    <div className="flex flex-col" style={{ width: 340 }}>
      {view === 'main' ? mainView : pickerView}
    </div>
  );

  // the pill's switch is the capture-mode control; with nothing to capture it
  // sits disabled and the pill (still clickable) is where you fix that
  const canSegment = activeCount > 0;
  const onSwitch = (on: boolean) => {
    issuesStore.setCaptureMode(on ? 'segments' : 'full');
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={onOpenChange}
        trigger="click"
        placement="bottomLeft"
        content={content}
      >
        {/* the switcher-that-opens: a real Switch (flips capture in place,
            click stops there) inside a pill whose remaining surface opens the
            popover — same height/idiom as the small trigger buttons, but the
            embedded switch keeps it from reading as a list filter. Mehdi's
            "alive" cue (07-07) now pulses from the switch itself when on. */}
        <Tooltip
          placement="bottom"
          title={
            open
              ? ''
              : segmentsMode
                ? `Capturing only active segments (${activeCount}) — switch off for full traffic`
                : canSegment
                  ? 'Capturing full traffic — switch on to capture only active segments'
                  : 'Capturing full traffic — open to add a segment and capture less'
          }
        >
          <div
            role="button"
            tabIndex={0}
            aria-expanded={open}
            aria-label={`Traffic segments — ${segmentsMode ? `capturing ${activeCount} active` : 'off, capturing full traffic'}. Opens settings`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(!open);
              }
            }}
            className="capture-pill border rounded-md flex items-center gap-2 pl-1.5 pr-2 shrink-0 cursor-pointer select-none"
            style={{ height: 24 }}
          >
            {/* live switch owns its clicks; a disabled one passes them
                through, so tapping it still opens the popover (the only way
                to make it enableable) */}
            <span
              className="flex items-center"
              onClick={
                segmentsMode || canSegment
                  ? (e) => e.stopPropagation()
                  : undefined
              }
            >
              <Switch
                size="small"
                checked={segmentsMode}
                disabled={!segmentsMode && !canSegment}
                // capture-switch pins the label spans to the track height so
                // the SVG icons can't break antd's stacked-span slide
                className={`capture-switch${segmentsMode ? ' seg-live-border' : ''}`}
                style={
                  !segmentsMode && !canSegment
                    ? { pointerEvents: 'none' }
                    : undefined
                }
                // mode icons ride the switch: Split when capturing segments,
                // Globe when on full traffic — the same pair the popover's
                // Segmented uses
                checkedChildren={<Split size={10} />}
                unCheckedChildren={<Globe size={10} />}
                aria-label={`Segment capture ${segmentsMode ? 'on' : 'off'}`}
                onChange={onSwitch}
              />
            </span>
            <span className="text-sm" style={{ color: 'var(--color-gray-darkest)' }}>
              Traffic segments
              {segmentsMode && (
                <span style={{ color: 'var(--color-gray-dark)' }}>
                  {' '}· {activeCount} active
                </span>
              )}
            </span>
            <ChevronDown size={13} style={{ opacity: 0.6 }} />
          </div>
        </Tooltip>
      </Popover>

      <SegmentDrawer
        open={drawerOpen}
        segment={editing}
        source="issues"
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

export default observer(SegmentsIndicator);

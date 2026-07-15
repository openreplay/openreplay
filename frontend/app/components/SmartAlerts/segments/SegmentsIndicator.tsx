import { Button, Input, Popover, Segmented, Switch, Tooltip } from 'antd';
import {
  ChevronDown,
  ChevronLeft,
  Globe,
  Info,
  Lock,
  Pencil,
  Plus,
  Search,
  Split,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';

import type { SavedSegment } from '../api';
import SegmentConditions from './SegmentConditions';
import SegmentDrawer from './SegmentDrawer';
import './captureSwitch.css';

/* The Traffic Segments entry point: one pill by the "Issues" title that is
   both the on/off control and the door to settings. A real switch flips
   capture mode in place; clicking the rest of the pill opens this popover with
   two views — the capturing segments (Mine / Team, a switch per segment,
   edit on your own, "Add segment" at the bottom) and the picker (existing
   segments to switch on; only team-visible ones are eligible). */

function SegmentRow({
  segment,
  onEdit,
}: {
  segment: SavedSegment;
  onEdit: (s: SavedSegment) => void;
}) {
  const { issuesStore } = useStore();
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-gray-lightest transition-colors">
      <span
        className={`text-sm font-medium truncate min-w-0 flex-1 cursor-default ${
          segment.active ? 'color-gray-darkest' : 'color-gray-dark'
        }`}
      >
        {segment.name}
      </span>
      <Popover
        content={<SegmentConditions segment={segment} />}
        placement="left"
        trigger="hover"
        mouseEnterDelay={0.45}
      >
        <span className="shrink-0 flex items-center cursor-help color-gray-medium">
          <Info size={13} />
        </span>
      </Popover>

      <Switch
        size="small"
        checked={segment.active}
        aria-label={`${segment.name} — ${segment.active ? t('on') : t('off')}`}
        onChange={(on) => {
          if (issuesStore.toggleSegment(segment.id, on))
            toast.info(
              t('No active segments left — capture switched to full traffic.'),
            );
        }}
      />

      <span className="w-6 shrink-0 flex items-center justify-center">
        {segment.mine ? (
          <Tooltip title={t('Edit')} placement="top">
            <button
              type="button"
              aria-label={t('Edit segment')}
              onClick={() => onEdit(segment)}
              className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity color-gray-medium"
            >
              <Pencil size={14} />
            </button>
          </Tooltip>
        ) : (
          <Tooltip
            title={t('Only {{name}} can edit this segment.', {
              name: segment.createdBy,
            })}
            placement="top"
          >
            <span className="w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-40 transition-opacity cursor-not-allowed color-gray-medium">
              <Pencil size={14} />
            </span>
          </Tooltip>
        )}
      </span>
    </div>
  );
}

function CandidateRow({
  segment,
  onEnable,
}: {
  segment: SavedSegment;
  onEnable: (s: SavedSegment) => void;
}) {
  const { t } = useTranslation();
  const eligible = segment.isPublic;
  return (
    <div
      role={eligible ? 'button' : undefined}
      onClick={eligible ? () => onEnable(segment) : undefined}
      className={`flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg transition-colors${
        eligible ? ' cursor-pointer hover:bg-gray-lightest group' : ''
      }`}
      style={eligible ? undefined : { opacity: 0.55 }}
    >
      <span className="text-sm font-medium truncate min-w-0 flex-1 color-gray-darkest">
        {segment.name}
      </span>
      <Popover
        content={<SegmentConditions segment={segment} />}
        placement="left"
        trigger="hover"
        mouseEnterDelay={0.45}
      >
        <span
          className="shrink-0 flex items-center cursor-help color-gray-medium"
          onClick={(e) => e.stopPropagation()}
        >
          <Info size={13} />
        </span>
      </Popover>
      {eligible ? (
        <span
          className="w-4 shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-main)' }}
        >
          <Plus size={15} />
        </span>
      ) : (
        <Tooltip
          title={t('Private — make it team-visible to capture traffic.')}
          placement="left"
        >
          <span className="w-4 shrink-0 flex items-center cursor-help color-gray-medium">
            <Lock size={13} />
          </span>
        </Tooltip>
      )}
    </div>
  );
}

function SegmentsIndicator() {
  const { issuesStore } = useStore();
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<'main' | 'picker'>('main');
  const [pickerQuery, setPickerQuery] = React.useState('');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SavedSegment | null>(null);
  // pin rows listed on open so a switched-off row can be undone in place
  // (capture is one flag — off rows drop from the list on the next open)
  const [pinned, setPinned] = React.useState<string[]>([]);

  const listed = issuesStore.segments.filter(
    (s) => s.active || pinned.includes(s.id),
  );
  const mine = listed.filter((s) => s.mine);
  const team = listed.filter((s) => !s.mine);
  const activeCount = issuesStore.activeSegmentCount;
  const segmentsMode = issuesStore.captureMode === 'segments';

  const q = pickerQuery.trim().toLowerCase();
  const allCandidates = issuesStore.segments
    .filter(
      (s) => (s.isPublic || s.mine) && !s.active && !pinned.includes(s.id),
    )
    .filter((s) => !q || s.name.toLowerCase().includes(q))
    .sort(
      (a, b) =>
        Number(b.isPublic) - Number(a.isPublic) || b.updatedAt - a.updatedAt,
    );
  const candidates = q ? allCandidates : allCandidates.slice(0, 5);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      setPinned(issuesStore.capturingSegments.map((s) => s.id));
    } else {
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

  const enable = (s: SavedSegment) => {
    issuesStore.enableCapture(s.id);
    setPinned((p) => (p.includes(s.id) ? p : [...p, s.id]));
    setView('main');
    setPickerQuery('');
    toast.success(t('{{name}} added to traffic segments.', { name: s.name }));
  };

  const sectionTitle = (label: string) => (
    <div className="text-[11px] font-medium uppercase tracking-wider mt-3 mb-0.5 color-gray-medium">
      {label}
    </div>
  );

  const mainView = (
    <>
      <div className="pb-2.5 border-b -mx-1 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-semibold color-gray-darkest">
            {t('Traffic Segments')}
          </span>
          <Tooltip
            placement="bottom"
            title={t(
              "Choose what the agent captures: the full traffic sample, or only sessions matching your active segments. Anyone can switch — it's the project's shared capture setting.",
            )}
          >
            <span className="flex items-center cursor-help color-gray-medium">
              <Info size={14} />
            </span>
          </Tooltip>
        </div>
        <div className="text-xs mt-0.5 color-gray-medium">
          {t('Capture everything, or only the traffic you care about.')}
        </div>
      </div>

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
                  <Globe size={14} /> {t('Full traffic')}
                </span>
              ),
            },
            {
              value: 'segments',
              disabled: activeCount === 0,
              label: (
                <span className="flex items-center justify-center gap-1.5 py-0.5">
                  <Split size={14} /> {t('Segments')}
                </span>
              ),
            },
          ]}
        />
        <span className="text-xs color-gray-medium">
          {segmentsMode
            ? t('Only sessions matching active segments are captured.')
            : activeCount === 0
              ? t('Turn on a segment to enable segment capture.')
              : t(
                  'The agent samples across all traffic. Active segments apply when you switch.',
                )}
        </span>
      </div>

      {listed.length === 0 ? (
        <div className="text-sm py-3 color-gray-medium">
          {t(
            'No capturing segments yet — the agent captures the full traffic sample. Add one to capture only the part you care about.',
          )}
        </div>
      ) : (
        <div
          className={`transition-opacity duration-200${segmentsMode ? '' : ' opacity-50'}`}
        >
          {mine.length > 0 && sectionTitle(t('Mine'))}
          {mine.map((s) => (
            <SegmentRow key={s.id} segment={s} onEdit={startEdit} />
          ))}
          {team.length > 0 && sectionTitle(t('Team'))}
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
          {t('Add segment')}
        </Button>
      </div>
    </>
  );

  const pickerView = (
    <>
      <div className="flex items-center gap-1 pb-2.5 border-b -mx-1 px-1">
        <Button
          type="text"
          size="small"
          icon={<ChevronLeft size={15} />}
          onClick={() => setView('main')}
          aria-label={t('Back')}
          className="px-1!"
        />
        <span className="text-base font-semibold color-gray-darkest">
          {t('Add segment')}
        </span>
      </div>

      <div className="mt-2.5">
        <Input
          size="small"
          allowClear
          autoFocus
          placeholder={t('Search segments')}
          prefix={
            <Search
              size={14}
              className="color-gray-medium"
              style={{ marginRight: 2 }}
            />
          }
          value={pickerQuery}
          onChange={(e) => setPickerQuery(e.target.value)}
        />
      </div>

      {!q && candidates.length > 0 && sectionTitle(t('Recently updated'))}

      <div
        className="overflow-y-auto mt-1 -mx-1 px-1"
        style={{ maxHeight: 264 }}
      >
        {candidates.length ? (
          candidates.map((s) => (
            <CandidateRow key={s.id} segment={s} onEnable={enable} />
          ))
        ) : (
          <div className="text-sm px-1 py-3 color-gray-medium">
            {q
              ? t('No segments match “{{q}}”', { q: pickerQuery })
              : t(
                  'Every existing segment is already capturing — create a new one below.',
                )}
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
          {t('Create new')}
        </Button>
      </div>
    </>
  );

  const content = (
    <div className="flex flex-col" style={{ width: 340 }}>
      {view === 'main' ? mainView : pickerView}
    </div>
  );

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
        <Tooltip
          placement="bottom"
          title={
            open
              ? ''
              : segmentsMode
                ? t(
                    'Capturing only active segments ({{count}}) — switch off for full traffic',
                    { count: activeCount },
                  )
                : canSegment
                  ? t(
                      'Capturing full traffic — switch on to capture only active segments',
                    )
                  : t(
                      'Capturing full traffic — open to add a segment and capture less',
                    )
          }
        >
          <div
            role="button"
            tabIndex={0}
            aria-expanded={open}
            aria-label={t('Traffic segments settings')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(!open);
              }
            }}
            className="capture-pill border rounded-md flex items-center gap-2 pl-1.5 pr-2 shrink-0 cursor-pointer select-none"
            style={{ height: 24 }}
          >
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
                className={`capture-switch${segmentsMode ? ' seg-live-border' : ''}`}
                style={
                  !segmentsMode && !canSegment
                    ? { pointerEvents: 'none' }
                    : undefined
                }
                checkedChildren={<Split size={10} />}
                unCheckedChildren={<Globe size={10} />}
                aria-label={t('Segment capture')}
                onChange={onSwitch}
              />
            </span>
            <span className="text-sm color-gray-darkest">
              {t('Traffic segments')}
              {segmentsMode && (
                <span className="color-gray-dark">
                  {' '}
                  · {t('{{count}} active', { count: activeCount })}
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

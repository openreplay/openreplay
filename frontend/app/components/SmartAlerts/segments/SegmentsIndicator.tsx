import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { Switch } from '@/ui/inputs/switch';
import { Segmented } from '@/ui/inputs/toggle-group';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { PopoverPanel } from '@/ui/overlays/popover';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import {
  ChevronLeft,
  Globe,
  Info,
  Lock,
  Pencil,
  Plus,
  Split,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import type { SavedSegment } from '../api';
import SegmentConditions from './SegmentConditions';
import SegmentDrawer from './SegmentDrawer';
import './capture.css';

function Conditions({ segment }: { segment: SavedSegment }) {
  return (
    <PopoverPanel
      placement="leftTop"
      content={
        <div className="m-capture__conditions">
          <SegmentConditions segment={segment} />
        </div>
      }
    >
      <button
        type="button"
        className="m-capture__hint"
        aria-label={segment.name}
        onClick={(e) => e.stopPropagation()}
      >
        <Info size={13} />
      </button>
    </PopoverPanel>
  );
}

const SegmentRow = observer(function SegmentRow({
  segment,
  onEdit,
}: {
  segment: SavedSegment;
  onEdit: (s: SavedSegment) => void;
}) {
  const { issuesStore } = useStore();
  const { t } = useTranslation();
  const toast = useToast();
  return (
    <div className="m-capture__row">
      <span className="m-capture__name m-truncate">{segment.name}</span>
      <Conditions segment={segment} />
      <Switch
        checked={segment.active}
        aria-label={`${segment.name} — ${segment.active ? t('on') : t('off')}`}
        onCheckedChange={(on) => {
          if (issuesStore.toggleSegment(segment.id, on))
            toast.info(
              t('No active segments left. Capture switched to full traffic.'),
            );
        }}
      />
      {segment.mine ? (
        <Tooltip title={t('Edit')}>
          <button
            type="button"
            className="m-capture__act"
            aria-label={t('Edit segment')}
            onClick={() => onEdit(segment)}
          >
            <Pencil size={13} />
          </button>
        </Tooltip>
      ) : (
        <Tooltip
          title={t('Only {{name}} can edit this segment.', {
            name: segment.createdBy,
          })}
        >
          <span className="m-capture__act" aria-hidden="true">
            <Lock size={13} />
          </span>
        </Tooltip>
      )}
    </div>
  );
});

/* Traffic segments: what the agent captures, full traffic or chosen segments. */
function SegmentsIndicator() {
  const { issuesStore } = useStore();
  const { t } = useTranslation();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<'main' | 'picker'>('main');
  const [query, setQuery] = React.useState('');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SavedSegment | null>(null);
  // rows listed on open stay listed, so a switched-off one can be undone in place
  const [pinned, setPinned] = React.useState<string[]>([]);

  const listed = issuesStore.segments.filter(
    (s) => s.active || pinned.includes(s.id),
  );
  const mine = listed.filter((s) => s.mine);
  const team = listed.filter((s) => !s.mine);
  const activeCount = issuesStore.activeSegmentCount;
  const segmentsMode = issuesStore.captureMode === 'segments';

  const q = query.trim().toLowerCase();
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
    if (o) setPinned(issuesStore.capturingSegments.map((s) => s.id));
    else {
      setView('main');
      setQuery('');
    }
  };
  const openDrawer = (s: SavedSegment | null) => {
    setEditing(s);
    setOpen(false);
    setDrawerOpen(true);
  };
  const enable = (s: SavedSegment) => {
    issuesStore.enableCapture(s.id);
    setPinned((p) => (p.includes(s.id) ? p : [...p, s.id]));
    setView('main');
    setQuery('');
    toast.success(t('{{name}} added to traffic segments.', { name: s.name }));
  };

  const main = (
    <>
      <div className="m-capture__head">
        <span className="m-capture__title">
          {t('Traffic segments')}
          <Tooltip
            title={t(
              "Choose what the agent captures: the full traffic sample, or only sessions matching your active segments. It's the project's shared capture setting.",
            )}
          >
            <Info size={13} className="text-content-decorative" />
          </Tooltip>
        </span>
        <span className="m-capture__note">
          {t('Capture everything, or only the traffic you care about.')}
        </span>
      </div>
      <div className="m-capture__mode">
        <Segmented
          block
          value={issuesStore.captureMode}
          onChange={(v) => issuesStore.setCaptureMode(v as 'full' | 'segments')}
          ariaLabel={t('Capture')}
          options={[
            {
              value: 'full',
              icon: <Globe size={13} />,
              label: t('Full traffic'),
            },
            {
              value: 'segments',
              icon: <Split size={13} />,
              label: t('Segments'),
              disabled: activeCount === 0,
            },
          ]}
        />
        <span className="m-capture__note">
          {segmentsMode
            ? t('Only sessions matching active segments are captured.')
            : activeCount === 0
              ? t('Turn on a segment to enable segment capture.')
              : t(
                  'The agent samples across all traffic. Active segments apply when you switch.',
                )}
        </span>
      </div>
      <div className={`m-capture__list${segmentsMode ? '' : ' is-dim'}`}>
        {listed.length === 0 ? (
          <p className="m-capture__empty">
            {t(
              'No capturing segments yet. Add one to capture only the part you care about.',
            )}
          </p>
        ) : (
          <>
            {mine.length > 0 && (
              <p className="m-capture__section">{t('Mine')}</p>
            )}
            {mine.map((s) => (
              <SegmentRow key={s.id} segment={s} onEdit={openDrawer} />
            ))}
            {team.length > 0 && (
              <p className="m-capture__section">{t('Team')}</p>
            )}
            {team.map((s) => (
              <SegmentRow key={s.id} segment={s} onEdit={openDrawer} />
            ))}
          </>
        )}
      </div>
      <div className="m-capture__foot">
        <Button variant="subtle" onClick={() => setView('picker')}>
          <Plus size={14} />
          {t('Add segment')}
        </Button>
      </div>
    </>
  );

  const picker = (
    <>
      <div className="m-capture__back">
        <IconButton
          icon={<ChevronLeft size={14} />}
          label={t('Back')}
          variant="ghost"
          onClick={() => setView('main')}
        />
        <span className="m-capture__title">{t('Add segment')}</span>
      </div>
      <PopoverSearch
        placeholder={t('Search segments')}
        value={query}
        onChange={setQuery}
      />
      <div className="m-capture__list">
        {!q && candidates.length > 0 && (
          <p className="m-capture__section">{t('Recently updated')}</p>
        )}
        {candidates.length ? (
          candidates.map((s) =>
            s.isPublic ? (
              <button
                key={s.id}
                type="button"
                className="m-capture__row"
                onClick={() => enable(s)}
              >
                <span className="m-capture__name m-truncate">{s.name}</span>
                <Conditions segment={s} />
                <span className="m-capture__act">
                  <Plus size={14} />
                </span>
              </button>
            ) : (
              <div key={s.id} className="m-capture__row is-locked">
                <span className="m-capture__name m-truncate">{s.name}</span>
                <Tooltip
                  title={t(
                    'Private. Make it team-visible to capture its traffic.',
                  )}
                >
                  <span className="m-capture__hint">
                    <Lock size={13} />
                  </span>
                </Tooltip>
              </div>
            ),
          )
        ) : (
          <p className="m-capture__empty">
            {q
              ? t('No segments match “{{q}}”', { q: query })
              : t(
                  'Every existing segment is already capturing. Create a new one below.',
                )}
          </p>
        )}
      </div>
      <div className="m-capture__foot">
        <Button variant="subtle" onClick={() => openDrawer(null)}>
          <Plus size={14} />
          {t('Create new')}
        </Button>
      </div>
    </>
  );

  return (
    <>
      <PopoverPanel
        open={open}
        onOpenChange={onOpenChange}
        placement="bottomRight"
        content={
          <div className="m-capture__panel">
            {view === 'main' ? main : picker}
          </div>
        }
      >
        <IconButton
          icon={segmentsMode ? <Split size={15} /> : <Globe size={15} />}
          label={
            segmentsMode
              ? t('Capturing {{count}} segments', { count: activeCount })
              : t('Capturing full traffic')
          }
          count={segmentsMode ? activeCount : 0}
          active={segmentsMode}
          open={open}
        />
      </PopoverPanel>
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

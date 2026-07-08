import React from 'react';
import { Alert, Button, Drawer, Input, Tooltip } from 'antd';
import { Check, Info, Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { searchStore, filterStore } from 'App/mstore';
import { filterPool, MOCK_SESSION_POOL } from 'App/dev/mockSessions';
import SessionFilters from 'Shared/SessionFilters';
import type { TrafficSegment, SegmentFilterSeed } from 'App/mstore/issuesStore';

/* The create/edit surface for a traffic segment. The query editor is the
   LITERAL Sessions omni-search (<SessionFilters/>, bound to the global
   searchStore) — identical behavior by construction. While the drawer is open
   we borrow the searchStore: its filters are snapshotted on open and restored
   on close, so the Sessions page never notices. */

// how much the agent samples per day, project-wide (Mehdi: ~100 of ~2,000)
const DAILY_TRAFFIC = 2000;

/** serialize the live omni-search filters into a plain, re-hydratable shape */
function serialize(filters: any[]): SegmentFilterSeed[] {
  return filters.map((f) => ({
    name: f.name,
    isEvent: !!f.isEvent,
    autoCaptured: f.autoCaptured,
    operator: f.operator,
    value: [...(f.value ?? [])].filter((v) => v != null),
  }));
}

/** rebuild real catalog filters from seeds (the mockBootstrap findEvent pattern) */
function hydrate(seeds: SegmentFilterSeed[]): any[] {
  return seeds
    .map((s) => {
      const found = filterStore.findEvent({
        name: s.name,
        isEvent: s.isEvent,
        autoCaptured: s.autoCaptured,
      });
      if (!found) return null;
      return {
        ...found,
        value: [...s.value],
        operator: s.operator ?? found.operator,
        filters: [],
      };
    })
    .filter(Boolean);
}

/** one-line human summary of the query, for the popover rows */
function summarize(filters: any[]): string {
  if (!filters.length) return 'All traffic';
  return filters
    .map((f) => {
      const label = f.displayName || f.label || f.name;
      const vals = (f.value ?? []).filter((v: any) => v !== '' && v != null);
      return vals.length ? `${label} ${f.operator ?? '='} ${vals.join(', ')}` : label;
    })
    .join(' · ');
}

interface Props {
  open: boolean;
  /** editing an existing segment; null = creating a new one */
  segment: TrafficSegment | null;
  onClose: () => void;
}

function SegmentDrawer({ open, segment, onClose }: Props) {
  const { issuesStore } = useStore();
  const [name, setName] = React.useState('');
  const [instructions, setInstructions] = React.useState('');
  // instructions hidden behind a blue "Add instructions" link (Mehdi 07-07);
  // auto-expanded when editing a segment that already has some
  const [showInstructions, setShowInstructions] = React.useState(false);
  // bump to re-read the live estimate as the user edits the query
  const [, setTick] = React.useState(0);
  const snapshot = React.useRef<any[] | null>(null);

  // borrow the searchStore while open: snapshot → load this segment's query
  // (or empty) → hand the keys back on close
  React.useEffect(() => {
    if (open) {
      snapshot.current = searchStore.instance.filters;
      searchStore.edit({ filters: segment ? hydrate(segment.seeds) : [] });
      setName(segment?.name ?? '');
      setInstructions(segment?.instructions ?? '');
      setShowInstructions(Boolean(segment?.instructions));
    } else if (snapshot.current) {
      searchStore.edit({ filters: snapshot.current });
      snapshot.current = null;
    }
  }, [open, segment]);

  // live estimate: run the query over the same in-memory pool the Sessions page
  // searches, scaled to the project's daily traffic
  const filters = searchStore.instance.filters;
  const { total } = open
    ? filterPool({ ...searchStore.instance.toSearch(), page: 1, limit: 1 })
    : { total: 0 };
  const poolSize = MOCK_SESSION_POOL.length || 1;
  const pct = Math.max(total > 0 ? 1 : 0, Math.round((total / poolSize) * 100));
  const perDay = Math.round((DAILY_TRAFFIC * total) / poolSize);
  const narrowed = filters.length > 0;

  const save = () => {
    const live = searchStore.instance.filters;
    issuesStore.saveSegment({
      id: segment?.id,
      name: name.trim() || 'Untitled segment',
      active: segment?.active ?? true,
      seeds: serialize(live),
      summary: summarize(live),
      trafficPct: pct,
      sessionsPerDay: perDay,
      instructions: instructions.trim() || undefined,
    });
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      title={segment ? 'Edit segment' : 'New segment'}
      styles={{ wrapper: { width: 560 }, footer: { padding: '12px 24px' } }}
      footer={
        <div className="flex items-center justify-between">
          <Button type="text" onClick={onClose}>
            Cancel
          </Button>
          <Button type="primary" icon={<Check size={15} />} onClick={save}>
            {segment ? 'Save segment' : 'Create segment'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4" onKeyUp={() => setTick((t) => t + 1)} onClick={() => setTick((t) => t + 1)}>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
            Name
          </span>
          <Input
            autoFocus={!segment}
            placeholder="e.g. Billing & checkout"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
              What to capture
            </span>
            <Tooltip title="Define the portion of traffic with the same events and filters as the Sessions search. In segment capture, the agent records only sessions matching active segments.">
              <span className="flex items-center cursor-help" style={{ color: 'var(--color-gray-medium)' }}>
                <Info size={13} />
              </span>
            </Tooltip>
          </div>
          {/* the Sessions omni-search, verbatim */}
          <SessionFilters />
        </div>

        {/* the estimate (Mehdi 07-07: "make it nice") — the app's standard
            info banner (antd Alert, as in NoSessionsMessage), uniform text */}
        <Alert
          type="info"
          showIcon
          className="border-transparent rounded-lg"
          title={
            narrowed
              ? `Captures ≈${pct}% of your traffic · ~${perDay.toLocaleString()} sessions analysed per day`
              : 'Add events or filters to narrow the segment — right now it matches all traffic.'
          }
        />

        {showInstructions ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
              Instructions{' '}
              <span className="font-normal" style={{ color: 'var(--color-gray-medium)' }}>
                (optional)
              </span>
            </span>
            <Input.TextArea
              rows={3}
              maxLength={500}
              autoFocus={!segment?.instructions}
              placeholder='Extra context for the agent — e.g. "pay special attention to coupon and card-validation errors"'
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
        ) : (
          <Button
            type="link"
            size="small"
            icon={<Plus size={14} />}
            onClick={() => setShowInstructions(true)}
            className="self-start px-0!"
          >
            Add instructions
          </Button>
        )}
      </div>
    </Drawer>
  );
}

export default observer(SegmentDrawer);

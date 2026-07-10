import React from 'react';
import { Alert, Button, Checkbox, Drawer, Input, Segmented, Select, Tooltip } from 'antd';
import { Info, Play } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { searchStore } from 'App/mstore';
import SessionFilters from 'Shared/SessionFilters';
import {
  estimateFromSeeds,
  hydrate,
  serialize,
  summarize,
} from 'Components/Issues/segments/segmentUtils';

import { auditsStore } from './auditsStore';

/* Configure + start a UX audit (Mehdi 07-01: the job can be pre-filtered —
   pages, geography, duration — before running over a sample of sessions).
   Scope uses the LITERAL Sessions omni-search, same borrow-the-searchStore
   pattern as the segment drawer; a segment can seed the scope in one click
   (Traffic Segments and Audits share the same query language). */

const PERIODS = [7, 30, 90] as const;
const SAMPLES = [500, 1000, 2000];

function NewAuditDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { issuesStore } = useStore();
  const [name, setName] = React.useState('');
  const [segmentId, setSegmentId] = React.useState<number | undefined>();
  const [periodDays, setPeriodDays] = React.useState<7 | 30 | 90>(30);
  const [sampleSize, setSampleSize] = React.useState(2000);
  const [emailWhenDone, setEmailWhenDone] = React.useState(true);
  const [, setTick] = React.useState(0);
  const snapshot = React.useRef<any[] | null>(null);

  React.useEffect(() => {
    if (open) {
      snapshot.current = searchStore.instance.filters;
      searchStore.edit({ filters: [] });
      setName('');
      setSegmentId(undefined);
      setPeriodDays(30);
      setSampleSize(2000);
      setEmailWhenDone(true);
    } else if (snapshot.current) {
      searchStore.edit({ filters: snapshot.current });
      snapshot.current = null;
    }
  }, [open]);

  // picking a segment loads its query into the scope editor — still editable
  const applySegment = (id?: number) => {
    setSegmentId(id);
    const segment = issuesStore.segmentById(id);
    searchStore.edit({ filters: segment ? hydrate(segment.seeds) : [] });
    setTick((t) => t + 1);
  };

  const filters = searchStore.instance.filters;
  const { perDay } = open
    ? estimateFromSeeds(serialize(filters))
    : { perDay: 0 };
  const matched = perDay * periodDays;
  const analysed = Math.min(sampleSize, matched);

  const segment = issuesStore.segmentById(segmentId);
  const run = () => {
    const scopeSummary = summarize(filters);
    const audit = auditsStore.start({
      name:
        name.trim() ||
        `${segment?.name ?? (filters.length ? scopeSummary : 'Full traffic')} — ${new Date().toLocaleDateString('en-US', { month: 'long' })}`,
      scope: [
        segment ? `Segment: ${segment.name}` : filters.length ? scopeSummary : 'Full traffic',
        `Last ${periodDays} days`,
      ],
      periodDays,
      matched,
      sampleSize: analysed,
      emailWhenDone,
    });
    onClose();
    return audit;
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      title="New audit"
      styles={{ wrapper: { width: 560 }, footer: { padding: '12px 24px' } }}
      footer={
        <div className="flex items-center justify-between">
          <Button type="text" onClick={onClose}>
            Cancel
          </Button>
          <Button type="primary" icon={<Play size={15} />} onClick={run}>
            Run audit
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4" onKeyUp={() => setTick((t) => t + 1)} onClick={() => setTick((t) => t + 1)}>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
            Name{' '}
            <span className="font-normal" style={{ color: 'var(--color-gray-medium)' }}>
              (optional)
            </span>
          </span>
          <Input
            placeholder="e.g. Checkout & billing — July"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
              What to audit
            </span>
            <Tooltip title="The slice of traffic the agent reads. Start from a saved segment or build the scope with the same events and filters as the Sessions search. Leave empty to audit full traffic.">
              <span className="flex items-center cursor-help" style={{ color: 'var(--color-gray-medium)' }}>
                <Info size={13} />
              </span>
            </Tooltip>
          </div>
          <Select
            allowClear
            placeholder="Start from a segment (optional)"
            value={segmentId}
            onChange={applySegment}
            onClear={() => applySegment(undefined)}
            options={issuesStore.visibleSegments.map((s) => ({
              value: s.id,
              label: s.name,
            }))}
          />
          {/* the Sessions omni-search, verbatim */}
          <SessionFilters />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
              Period
            </span>
            <Segmented
              size="small"
              value={periodDays}
              onChange={(v) => setPeriodDays(v as 7 | 30 | 90)}
              options={PERIODS.map((d) => ({ value: d, label: `${d} days` }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
              Sample
            </span>
            <Select
              size="small"
              value={sampleSize}
              onChange={setSampleSize}
              style={{ width: 150 }}
              options={SAMPLES.map((n) => ({
                value: n,
                label: `${n.toLocaleString()} sessions`,
              }))}
            />
          </div>
        </div>

        <Alert
          type="info"
          showIcon
          className="border-transparent rounded-lg"
          title={`≈${matched.toLocaleString()} sessions match this scope over the last ${periodDays} days — the agent will read a sample of ${analysed.toLocaleString()}. Expect the report in a few hours.`}
        />

        <Checkbox
          checked={emailWhenDone}
          onChange={(e) => setEmailWhenDone(e.target.checked)}
        >
          Email me when the report is ready
        </Checkbox>
      </div>
    </Drawer>
  );
}

export default observer(NewAuditDrawer);

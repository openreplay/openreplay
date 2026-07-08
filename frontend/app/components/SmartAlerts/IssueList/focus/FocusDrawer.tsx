import { Button, Drawer, Input, Tooltip } from 'antd';
import { Check, Info } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import SessionFilters from 'Shared/SessionFilters';

import type { Focus, FocusFilterSeed } from '../../api';

/* Create/edit surface for a focus. The query editor is the literal Sessions
   omni-search (<SessionFilters/>, bound to the global searchStore): while the
   drawer is open we snapshot the searchStore filters, load this focus's query,
   and restore on close so the Sessions page never notices.

   NOT-YET-BACKED: `saveFocus` persists through a stub API (no-op) and the
   traffic estimate the mock used is dropped until the backend can compute it. */

function serialize(filters: any[]): FocusFilterSeed[] {
  return filters.map((f) => ({
    name: f.name,
    isEvent: !!f.isEvent,
    autoCaptured: f.autoCaptured,
    operator: f.operator,
    value: [...(f.value ?? [])].filter((v) => v != null),
  }));
}

function summarize(filters: any[]): string {
  if (!filters.length) return 'All traffic';
  return filters
    .map((f) => {
      const label = f.displayName || f.label || f.name;
      const vals = (f.value ?? []).filter((v: any) => v !== '' && v != null);
      return vals.length
        ? `${label} ${f.operator ?? '='} ${vals.join(', ')}`
        : label;
    })
    .join(' · ');
}

interface Props {
  open: boolean;
  /** editing an existing focus; null = creating */
  focus: Focus | null;
  onClose: () => void;
}

function FocusDrawer({ open, focus, onClose }: Props) {
  const { issuesStore, searchStore, filterStore } = useStore();
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [instructions, setInstructions] = React.useState('');
  const snapshot = React.useRef<any[] | null>(null);

  // seed the fields from the focus when the drawer opens — adjusting state
  // during render (React's alternative to an effect for prop-derived state)
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(focus?.name ?? '');
      setInstructions(focus?.instructions ?? '');
    }
  }

  const hydrate = React.useCallback(
    (seeds: FocusFilterSeed[]): any[] =>
      seeds
        .map((s) => {
          const found = filterStore.findEvent?.({
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
        .filter(Boolean),
    [filterStore],
  );

  // borrow the searchStore while open, hand it back on close
  React.useEffect(() => {
    if (open) {
      snapshot.current = searchStore.instance.filters;
      searchStore.edit({ filters: focus ? hydrate(focus.seeds) : [] });
    } else if (snapshot.current) {
      searchStore.edit({ filters: snapshot.current });
      snapshot.current = null;
    }
  }, [open, focus]);

  const save = () => {
    const live = searchStore.instance.filters;
    issuesStore.saveFocus({
      id: focus?.id,
      name: name.trim() || t('Untitled focus'),
      active: focus?.active ?? true,
      seeds: serialize(live),
      summary: summarize(live),
      // NOT-YET-BACKED: the backend estimates the traffic share
      trafficPct: 0,
      sessionsPerDay: 0,
      instructions: instructions.trim() || undefined,
    });
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      title={focus ? t('Edit focus') : t('New focus')}
      styles={{ wrapper: { width: 560 }, footer: { padding: '12px 24px' } }}
      footer={
        <div className="flex items-center justify-between">
          <Button type="text" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button type="primary" icon={<Check size={15} />} onClick={save}>
            {focus ? t('Save focus') : t('Create focus')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium color-gray-darkest">
            {t('Name')}
          </span>
          <Input
            autoFocus={!focus}
            placeholder={t('e.g. Billing & checkout')}
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium color-gray-darkest">
              {t('What to watch')}
            </span>
            <Tooltip
              title={t(
                'Define the portion of traffic with the same events and filters as the Sessions search. The agent concentrates its analysis on sessions matching this.',
              )}
            >
              <span className="flex items-center cursor-help color-gray-medium">
                <Info size={13} />
              </span>
            </Tooltip>
          </div>
          {/* the Sessions omni-search, verbatim */}
          <SessionFilters />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium color-gray-darkest">
            {t('Instructions')}{' '}
            <span className="font-normal color-gray-medium">
              {t('(optional)')}
            </span>
          </span>
          <Input.TextArea
            rows={3}
            maxLength={500}
            placeholder={t(
              'Extra context for the agent — e.g. "pay special attention to coupon and card-validation errors"',
            )}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
      </div>
    </Drawer>
  );
}

export default observer(FocusDrawer);

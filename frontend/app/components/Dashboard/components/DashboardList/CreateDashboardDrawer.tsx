import { Button } from '@/ui/actions/button';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { Segmented } from '@/ui/inputs/toggle-group';
import {
  DrawerFooter,
  EntityDrawer,
  Section,
} from '@/ui/overlays/EntityDrawer';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import React from 'react';
import { useTranslation } from 'react-i18next';

import Widget from 'App/mstore/types/widget';
import { metricService } from 'App/services';
import { debounce } from 'App/utils';

import { cardIcon } from '../../cardIcons';

export interface NewDashboardSpec {
  name: string;
  isPublic: boolean;
  cards: Widget[];
}

interface Props {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onCreate: (spec: NewDashboardSpec) => void;
}

/** Name, who sees it, and which saved cards it starts with. */
export function CreateDashboardDrawer({
  open,
  busy,
  onClose,
  onCreate,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [isPublic, setPublic] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [cards, setCards] = React.useState<Widget[] | null>(null);
  const [picked, setPicked] = React.useState<Map<number, Widget>>(
    () => new Map(),
  );

  const load = React.useMemo(
    () =>
      debounce((q: string) => {
        void metricService
          .getMetricsPaginated({ page: 1, limit: 50, name: q })
          .then((resp: any) =>
            setCards(
              (resp.list ?? []).map((m: any) => new Widget().fromJson(m)),
            ),
          )
          .catch(() => setCards([]));
      }, 250),
    [],
  );

  React.useEffect(() => {
    if (open) load(query);
  }, [open, query]);

  const toggle = (c: Widget) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(c.metricId)) next.delete(c.metricId);
      else next.set(c.metricId, c);
      return next;
    });

  const hasLibrary = cards == null || cards.length > 0 || query !== '';

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      eyebrow={t('Dashboard')}
      title={name}
      onTitleChange={setName}
      autoEditTitle
      namePlaceholder={t('Dashboard name')}
      footer={
        <DrawerFooter
          left={
            <span className="m-ndash__count">
              {picked.size === 1
                ? t('1 card to start with')
                : t('{{n}} cards to start with', { n: picked.size })}
            </span>
          }
          right={
            <>
              <Button variant="subtle" onClick={onClose}>
                {t('Cancel')}
              </Button>
              <Button
                variant="primary"
                disabled={busy}
                onClick={() =>
                  onCreate({
                    name: name.trim() || t('Untitled dashboard'),
                    isPublic,
                    cards: [...picked.values()],
                  })
                }
              >
                {t('Create dashboard')}
              </Button>
            </>
          }
        />
      }
    >
      <Section title={t('Who sees it')}>
        <Segmented<'team' | 'private'>
          value={isPublic ? 'team' : 'private'}
          onChange={(v) => setPublic(v === 'team')}
          ariaLabel={t('Visibility')}
          options={[
            { value: 'team', label: t('Team') },
            { value: 'private', label: t('Only me') },
          ]}
        />
      </Section>

      <Section title={t('Your cards')}>
        <div className="m-ndash__list">
          {hasLibrary ? (
            <>
              <PopoverSearch
                placeholder={t('Search cards by title')}
                value={query}
                onChange={setQuery}
              />
              {cards != null && cards.length === 0 ? (
                <p className="m-ndash__hint">{t('No card matches that.')}</p>
              ) : (
                <div className="m-ndash__scroll">
                  {(cards ?? []).map((c) => {
                    const Icon = cardIcon(c.metricType, c.metricOf);
                    return (
                      <CheckRow
                        key={c.metricId}
                        on={picked.has(c.metricId)}
                        onToggle={() => toggle(c)}
                        icon={<Icon size={14} />}
                        meta={c.owner}
                      >
                        {c.name}
                      </CheckRow>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="m-ndash__hint">
              {t(
                'No saved cards yet. The dashboard starts empty; add cards to it from its page.',
              )}
            </p>
          )}
        </div>
      </Section>
    </EntityDrawer>
  );
}

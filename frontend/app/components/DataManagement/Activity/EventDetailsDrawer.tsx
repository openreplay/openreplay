import { useLast } from '@/lib/use-last';
import { Button } from '@/ui/actions/button';
import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';
import { CodeBlock } from '@/ui/data/CodeBlock';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { SearchField } from '@/ui/inputs/SearchField';
import { Segmented } from '@/ui/inputs/toggle-group';
import { EntityDrawer } from '@/ui/overlays/EntityDrawer';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { useQuery } from '@tanstack/react-query';
import { Braces, Code2, List, Play } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import Event from 'App/mstore/types/Analytics/Event';
import { session, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import { analyticsService } from 'App/services';

import usePropertyNames from '../Properties/usePropertyNames';
import '../data-management.css';

type Scope = 'all' | 'default' | 'custom';
type View = 'list' | 'json';

interface Props {
  eventId: string | null;
  onClose: () => void;
}

/** One event from the log or a person's timeline: every property it carried. */
function EventDetailsDrawer({ eventId, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const history = useHistory();
  const { filterStore, projectsStore, settingsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const timezone = settingsStore.sessionSettings.timezone?.value;
  const { getDisplayNameStr } = usePropertyNames('events');
  const [scope, setScope] = React.useState<Scope>('all');
  const [view, setView] = React.useState<View>('list');
  const [query, setQuery] = React.useState('');
  const shownId = useLast(eventId);

  const {
    data: event,
    isPending,
    isError,
  } = useQuery<Event>({
    queryKey: ['event-details', siteId, shownId],
    enabled: !!shownId,
    retry: false,
    queryFn: async () => new Event(await analyticsService.getEvent(shownId!)),
  });

  const props: Record<string, any> = event
    ? scope === 'all'
      ? event.allProps
      : scope === 'custom'
        ? event.customProps
        : event.defaultProps
    : {};
  const q = query.trim().toLowerCase();
  const rows = Object.entries(props).filter(
    ([k, v]) =>
      !q ||
      k.toLowerCase().includes(q) ||
      getDisplayNameStr(k).toLowerCase().includes(q) ||
      String(v).toLowerCase().includes(q),
  );
  const json = JSON.stringify(
    {
      event: event?.event_name ?? 'event',
      properties: Object.fromEntries(rows),
    },
    null,
    2,
  );

  const name = event ? filterStore.getFilterDisplayName(event.event_name) : '';
  const sub = event?.sub_name
    ? filterStore.getIssueSubName(event.sub_name)
    : '';
  const title = sub ? `${name} · ${sub}` : name;

  return (
    <EntityDrawer
      size="wide"
      open={eventId != null}
      onClose={onClose}
      eyebrow={t('Event')}
      title={title || t('Event')}
      meta={
        event ? (
          <>
            {name !== event.event_name && (
              <span className="m-dmg__mono">{event.event_name}</span>
            )}
            <span className="m-dmg__mono">{event.distinct_id}</span>
            <span>{event.city}</span>
            <span>{event.environment}</span>
            <RelativeTime at={event.created_at} timezone={timezone} />
          </>
        ) : undefined
      }
      headerActions={
        event?.session_id && event.session_id !== 'N/A' ? (
          <Button
            onClick={() =>
              history.push(withSiteId(session(event.session_id), siteId!))
            }
          >
            <Play size={13} />
            {t('Play session')}
          </Button>
        ) : undefined
      }
    >
      {isError ? (
        <EmptyState
          title={t('Could not load this event')}
          hint={t('It may have been removed, or the request failed.')}
        />
      ) : isPending || !event ? (
        <SkeletonRows rows={8} columns={[30, 70]} />
      ) : (
        <div className="m-evd">
          <Segmented
            block
            value={scope}
            onChange={(v) => setScope(v as Scope)}
            ariaLabel={t('Which properties')}
            options={[
              { value: 'all', label: t('All properties') },
              { value: 'default', label: t('OpenReplay') },
              { value: 'custom', label: t('Yours') },
            ]}
          />
          <div className="m-evd__tools">
            <Segmented
              value={view}
              onChange={(v) => setView(v as View)}
              ariaLabel={t('List or JSON')}
              options={[
                {
                  value: 'list',
                  icon: <List size={13} aria-label={t('List')} />,
                  title: t('List'),
                },
                {
                  value: 'json',
                  icon: <Braces size={13} aria-label="JSON" />,
                  title: 'JSON',
                },
              ]}
            />
            <SearchField
              placeholder={t('Find property')}
              value={query}
              onChange={setQuery}
            />
          </div>
          {view === 'json' ? (
            <CodeBlock
              code={json}
              language="JSON"
              copyLabel={t('Copy JSON')}
              onCopied={() => toast.success(t('JSON copied'))}
            />
          ) : rows.length === 0 ? (
            <p className="m-evd__none">{t('No property matches that.')}</p>
          ) : (
            <ul className="m-evd__list">
              {rows.map(([key, value]) => {
                const ours = !(key in event.customProps);
                return (
                  <li key={key} className="m-evd__row">
                    <Tooltip
                      title={
                        ours ? t('Set by OpenReplay') : t('Set by your code')
                      }
                      delay={400}
                    >
                      <span className="m-evd__origin">
                        {ours ? (
                          <OpenReplayMark variant="plain" size={12} />
                        ) : (
                          <Code2 size={13} aria-hidden="true" />
                        )}
                      </span>
                    </Tooltip>
                    <span className="m-evd__name m-truncate">
                      {getDisplayNameStr(key)}
                    </span>
                    <Tooltip title={String(value)} delay={500}>
                      <span className="m-evd__value m-truncate m-dmg__mono">
                        {String(value)}
                      </span>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </EntityDrawer>
  );
}

export default observer(EventDetailsDrawer);

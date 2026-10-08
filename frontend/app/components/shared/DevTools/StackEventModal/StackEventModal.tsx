import { JSONTree } from '@/ui/data/JSONTree';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { DrawerHeader, Section } from '@/ui/overlays/EntityDrawer';
import { useQuery } from '@tanstack/react-query';
import { DATADOG, SENTRY, STACKDRIVER } from 'Types/session/stackEvent';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { apiClient } from 'App/api_client';
import { useModal } from 'App/components/Modal';
import { StackFrame } from 'Components/Errors/StackTrace';

const SOURCE: Record<string, string> = {
  [SENTRY]: 'Sentry',
  [DATADOG]: 'Datadog',
  [STACKDRIVER]: 'Stackdriver',
};

/** One backend event from an integration, opened from the timeline or the events panel. */
function StackEventModal({ event }: { event: any }) {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  const { source, payload, name } = event;
  return (
    <div className="m-drawer__pane">
      <header className="m-drawer__head">
        <DrawerHeader
          eyebrow={SOURCE[source] ?? source}
          title={name || t('Backend event')}
          onClose={hideModal}
        />
      </header>
      <div className="m-drawer__body">
        {source === SENTRY ? (
          <SentryEvent event={payload} />
        ) : (
          <Section title={t('Payload')}>
            <Payload data={payload} />
          </Section>
        )}
      </div>
    </div>
  );
}

function Payload({ data }: { data: any }) {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return <JSONTree src={data} collapsed={false} />;
  }
  if (Array.isArray(data)) {
    const [head, rest] = data;
    return (
      <>
        {data.length > 1 && (
          <p className="m-mono mb-3 text-content-primary">
            {typeof head === 'string' ? head : JSON.stringify(head)}
          </p>
        )}
        <JSONTree src={data.length > 1 ? rest : head} collapsed={false} />
      </>
    );
  }
  return <p className="m-mono text-content-primary">{String(data ?? '')}</p>;
}

function SentryEvent({ event }: { event: any }) {
  const { t } = useTranslation();
  const { data, isPending, isError } = useQuery({
    queryKey: ['sentry-event', event?.id],
    queryFn: async () => {
      const r = await apiClient.get(`/integrations/sentry/events/${event.id}`);
      const j = await r.json();
      if (j.errors) throw new Error('sentry event');
      return j.data;
    },
    enabled: !!event?.id,
  });

  if (isPending && event?.id) {
    return (
      <div className="px-6 py-5">
        <SkeletonRows rows={5} />
      </div>
    );
  }
  const values:
    | { type: string; value: string; stacktrace?: any }[]
    | undefined = (data?.entries ?? []).find((e: any) => e.type === 'exception')
    ?.data?.values;
  if (!values) {
    return (
      <Section title={t('Payload')}>
        <JSONTree src={isError ? event : data} />
      </Section>
    );
  }
  return (
    <>
      {values.map(({ type, value, stacktrace }) => (
        <Section key={type} title={type}>
          <p className="m-mono mb-4 text-content-primary">{value}</p>
          <div className="m-errd__frames">
            {(stacktrace?.frames ?? []).map((f: any, i: number) => (
              <StackFrame
                key={`${f.filename}_${f.function}_${f.lineNo}`}
                frame={f}
                open={i === 0}
              />
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}

export default StackEventModal;

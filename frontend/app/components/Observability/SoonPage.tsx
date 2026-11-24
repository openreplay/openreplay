import { Button } from '@/ui/actions/button';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { PageCard } from '@/ui/layout/PageCard';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { logs as logsRoute, withSiteId } from 'App/routes';
import { useNavigate } from 'App/routing';

function SoonPage({ what }: { what: 'traces' | 'metrics' }) {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const navigate = useNavigate();
  const action = (
    <Button
      onClick={() =>
        navigate(withSiteId(logsRoute(), projectsStore.activeSiteId))
      }
    >
      {t('Open Logs')}
    </Button>
  );
  if (what === 'traces')
    return (
      <PageCard title={t('Traces')}>
        <EmptyState
          state="traces-soon"
          title={t('Traces are on the way')}
          hint={t(
            'Every request as a waterfall of spans, on the same window and filters as Logs. Until then, a log line carries its trace id and the search finds it.',
          )}
          action={action}
        />
      </PageCard>
    );
  return (
    <PageCard title={t('Metrics')}>
      <EmptyState
        state="metrics-soon"
        title={t('Metrics are on the way')}
        hint={t(
          'CPU, memory and request rates as charts, on the same window and filters as Logs. Until then, the logs show what your services did.',
        )}
        action={action}
      />
    </PageCard>
  );
}

export default observer(SoonPage);

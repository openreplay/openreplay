import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable } from '@/ui/data/table';
import { ListFooter } from '@/ui/layout/ListFooter';
import { RESOLVED } from 'Types/errorInfo';
import { ChevronRight } from 'lucide-react';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import 'App/components/Dashboard/charts.css';
import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import { useModal } from 'App/components/Modal';
import { RouteComponentProps, withRouter } from 'App/routing';

interface Props {
  metric: any;
  data: any;
  isEdit: any;
  history: any;
  location: any;
  inGrid?: boolean;
}
function CustomMetricTableErrors(props: RouteComponentProps & Props) {
  const { t } = useTranslation();
  const { metric, data } = props;
  const errorId = new URLSearchParams(props.location.search).get('errorId');
  const { showModal } = useModal();

  const onErrorClick = (e: any, error: any) => {
    e.stopPropagation();
    const urlParams = new URLSearchParams(props.location.search);
    // add new param to old ones
    urlParams.set('errorId', error.errorId);
    props.history.replace({
      search: urlParams.toString(),
    });
  };

  useEffect(() => {
    if (!errorId) return;

    showModal(<ErrorDetailsModal errorId={errorId} />, {
      right: true,
      size: 'wide',
      onClose: () => {
        if (
          props.history.location.pathname.includes('/dashboard') ||
          props.history.location.pathname.includes('/metrics/')
        ) {
          const urlParams = new URLSearchParams(props.location.search);
          urlParams.delete('errorId');
          props.history.replace({ search: urlParams.toString() });
        }
      },
    });
  }, [errorId]);

  const errors: any[] = data.errors || [];
  const compact = !!props.inGrid;
  const shown = compact ? errors.slice(0, 3) : errors;
  const rest = (data.total ?? errors.length) - shown.length;

  if (errors.length === 0) {
    return (
      <p className="m-top__empty">
        {t('No data available for the selected period.')}
      </p>
    );
  }

  const columns: Column<any>[] = [
    {
      title: t('Error'),
      key: 'message',
      width: compact ? '58%' : '46%',
      render: (e) => (
        <span className="m-errs__cell">
          <span
            className={`m-errs__name m-truncate${e.status === RESOLVED ? ' line-through' : ''}`}
          >
            {e.name}
            {!compact && e.stack0InfoString ? (
              <span className="m-errs__src m-mono"> {e.stack0InfoString}</span>
            ) : null}
          </span>
          <span className="m-errs__msg m-truncate">{e.message}</span>
        </span>
      ),
    },
    {
      title: t('Occurrences'),
      key: 'chart',
      width: compact ? '24%' : '18%',
      render: (e) => (
        <Spark values={(e.chart ?? []).map((p: any) => p.count)} />
      ),
    },
    {
      title: t('Sessions'),
      key: 'sessions',
      width: compact ? '18%' : '12%',
      align: 'right',
      render: (e) => <span className="m-mono">{fmt(e.sessions)}</span>,
    },
    ...(compact
      ? []
      : ([
          {
            title: t('Users'),
            key: 'users',
            width: '12%',
            align: 'right',
            render: (e: any) => <span className="m-mono">{fmt(e.users)}</span>,
          },
          {
            title: t('Last seen'),
            key: 'lastOccurrence',
            width: '12%',
            render: (e: any) =>
              e.lastOccurrence ? <RelativeTime at={e.lastOccurrence} /> : null,
          },
        ] as Column<any>[])),
  ];

  return (
    <div className={`m-errs${compact ? ' is-compact' : ''}`}>
      <DataTable<any>
        rowKey={(e) => String(e.errorId)}
        columns={columns}
        rows={shown}
        onRowClick={(e, ev) => onErrorClick(ev, e)}
        ariaLabel={t('JS errors')}
      />
      {compact ? (
        rest > 0 ? (
          <span className="m-top__more m-errs__more">
            {t('{{n}} more', { n: rest })}
            <ChevronRight size={13} />
          </span>
        ) : null
      ) : (
        <ListFooter
          page={metric.page}
          pageSize={5}
          total={data.total ?? errors.length}
          noun={[t('error'), t('errors')]}
          onPage={(page) => metric.updateKey('page', page)}
        />
      )}
    </div>
  );
}

const fmt = (n: number) => (n ?? 0).toLocaleString();

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <span
      className="m-errs__spark"
      role="img"
      aria-label={`${fmt(total)}`}
      title={`${fmt(total)}`}
    >
      {values.map((v, i) => (
        <i key={i} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
      ))}
    </span>
  );
}

export default withRouter<Props & RouteComponentProps, React.FunctionComponent>(
  CustomMetricTableErrors,
);

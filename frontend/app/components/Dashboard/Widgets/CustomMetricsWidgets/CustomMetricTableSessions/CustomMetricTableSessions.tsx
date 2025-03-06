import { observer, useObserver } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import SessionItem from 'Shared/SessionItem';
import { Pagination, NoContent } from 'UI';
import { useStore } from 'App/mstore';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import Session from 'App/mstore/types/session';
import { useTranslation } from 'react-i18next';

interface Props {
  metric: any;
  isTemplate?: boolean;
  isEdit?: boolean;
  data: any;
}

function CustomMetricTableSessions(props: Props) {
  const { t } = useTranslation();
  const { isEdit = false, metric, data } = props;

  const sessions = useMemo(
    () =>
      data && data.sessions
        ? data.sessions.map((session: any) => new Session().fromJson(session))
        : [],
    [],
  );

  return useObserver(() => (
    <NoContent
      show={!metric || !data || !sessions || sessions.length === 0}
      size="small"
      title={
        <div className="flex items-center justify-center flex-col">
          <AnimatedSVG name={ICONS.NO_SESSIONS} size={170} />
          <div className="mt-4" />
          <div className="text-center">
            {t('No relevant sessions found for the selected time period')}
          </div>
        </div>
      }
    >
      <div className="pb-4">
        {sessions &&
          sessions.map((session: any, index: any) => (
            <div className="border-b last:border-none" key={session.sessionId}>
              <SessionItem session={session} />
            </div>
          ))}

        {isEdit && (
          <div className="mt-6 flex items-center justify-center">
            <Pagination
              page={metric.page}
              total={data.total}
              onPageChange={(page: any) => metric.updateKey('page', page)}
              limit={data.total}
              debounceRequest={500}
            />
          </div>
        )}

        {!isEdit && <ViewMore total={data.total} limit={metric.limit} />}
      </div>
    </NoContent>
  ));
}

export default observer(CustomMetricTableSessions);

function ViewMore({ total, limit }: any) {
  const { t } = useTranslation();
  return total > limit ? (
    <div className="mt-4 flex items-center justify-center cursor-pointer w-fit mx-auto">
      <div className="text-center">
        <div className="color-teal text-lg">
          {t('All')}&nbsp;<span className="font-medium">{total}</span>&nbsp;
          {t('sessions')}
        </div>
      </div>
    </div>
  ) : null;
}

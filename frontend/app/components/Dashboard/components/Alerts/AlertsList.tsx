import React from 'react';
import { Loader, NoContent, Pagination } from 'UI';
import { filterList, sliceListPerPage } from 'App/utils';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import AlertListItem from './AlertListItem';
import { useTranslation } from 'react-i18next';

const pageSize = 10;

interface Props {
  siteId: string;
}

function AlertsList({ siteId }: Props) {
  const { t } = useTranslation();
  const { alertsStore, settingsStore } = useStore();
  const { fetchWebhooks, webhooks } = settingsStore;
  const { alerts: alertsList, alertsSearch, fetchList, init } = alertsStore;
  const { page } = alertsStore;

  React.useEffect(() => {
    fetchList();
    fetchWebhooks();
  }, []);
  const alertsArray = alertsList;

  const filteredAlerts = filterList(
    alertsArray,
    alertsSearch,
    ['name'],
    (item, query) => query.test(item.query.left),
  );
  const list = alertsSearch !== '' ? filteredAlerts : alertsArray;

  return (
    <Loader loading={alertsStore.loading}>
      <NoContent
        show={list.length === 0}
        title={
          <div className="flex flex-col items-center justify-center">
            <AnimatedSVG name={ICONS.NO_ALERTS} size={60} />
            <div className="text-center mt-4  text-lg font-medium">
              {alertsSearch !== ''
                ? t('No matching results')
                : t('No alerts have been configured yet')}
            </div>
          </div>
        }
        subtext={t(
          'Configure alerts to stay informed about app activity with threshold or change-based notifications.',
        )}
      >
        <div className="mt-3 border-b">
          <div className="grid grid-cols-12 py-2 font-medium px-6">
            <div className="col-span-8">{t('Title')}</div>
            <div className="col-span-2">{t('Type')}</div>
            <div className="col-span-2 text-right">{t('Modified')}</div>
          </div>

          {sliceListPerPage(list, page - 1, pageSize).map((alert: any) => (
            <React.Fragment key={alert.alertId}>
              <AlertListItem
                alert={alert}
                siteId={siteId}
                init={init}
                webhooks={webhooks}
              />
            </React.Fragment>
          ))}
        </div>

        <div className="w-full flex items-center justify-between pt-4 px-6">
          <div className="">
            {t('Showing')}{' '}
            <span className="font-medium">
              {Math.min(list.length, pageSize)}
            </span>{' '}
            {t('out of')}&nbsp;
            <span className="font-medium">{list.length}</span>&nbsp;
            {t('Alerts')}
          </div>
          <Pagination
            page={page}
            total={list.length}
            onPageChange={(page) => alertsStore.updateKey('page', page)}
            limit={pageSize}
            debounceRequest={100}
          />
        </div>
      </NoContent>
    </Loader>
  );
}

export default observer(AlertsList);

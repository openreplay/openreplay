import React from 'react';
import { NoContent, Pagination, Icon } from 'UI';
import { filterList } from 'App/utils';
import { sliceListPerPage } from 'App/utils';
import { fetchList } from 'Duck/alerts';
import { connect } from 'react-redux';
import { fetchList as fetchWebhooks } from 'Duck/webhook';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import AlertListItem from './AlertListItem'

const pageSize = 10;

interface Props {
  fetchList: () => void;
  list: any;
  alertsSearch: any;
  siteId: string;
  webhooks: Array<any>;
  init: (instance?: Alert) => void
  fetchWebhooks: () => void;
}

function AlertsList({ fetchList, list: alertsList, alertsSearch, siteId, init, fetchWebhooks, webhooks }: Props) {
  React.useEffect(() => { fetchList(); fetchWebhooks() }, []);

  const alertsArray = alertsList.toJS();
  const [page, setPage] = React.useState(1);

  const filteredAlerts = filterList(alertsArray, alertsSearch, ['name'], (item, query) => query.test(item.query.left))
  const list = alertsSearch !== '' ? filteredAlerts : alertsArray;
  const lenth = list.length;

  return (
    <NoContent
      show={lenth === 0}
      title={
        <div className="flex flex-col items-center justify-center">
          <AnimatedSVG name={ICONS.NO_ALERTS} size={80} />
          <div className="text-center text-gray-600 my-4">
            {alertsSearch !== '' ? 'No matching results' : "You haven't created any alerts yet"}
          </div>
        </div>
      }
    >
      <div className="mt-3 border-b">
        <div className="grid grid-cols-12 py-2 font-medium px-6">
          <div className="col-span-8">Title</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2 text-right">Modified</div>
        </div>

        {sliceListPerPage(list, page - 1, pageSize).map((alert: any) => (
          <React.Fragment key={alert.alertId}>
            <AlertListItem alert={alert} siteId={siteId} init={init} webhooks={webhooks} />
          </React.Fragment>
        ))}
      </div>

      <div className="w-full flex items-center justify-between pt-4 px-6">
        <div className="text-disabled-text">
          Showing <span className="font-semibold">{Math.min(list.length, pageSize)}</span> out of{' '}
          <span className="font-semibold">{list.length}</span> Alerts
        </div>
        <Pagination
          page={page}
          totalPages={Math.ceil(lenth / pageSize)}
          onPageChange={(page) => setPage(page)}
          limit={pageSize}
          debounceRequest={100}
        />
      </div>
    </NoContent>
  );
}

export default connect(
  (state) => ({
    // @ts-ignore
    list: state.getIn(['alerts', 'list']).sort((a, b) => b.createdAt - a.createdAt),
    // @ts-ignore
    alertsSearch: state.getIn(['alerts', 'alertsSearch']),
    // @ts-ignore
    webhooks: state.getIn(['webhooks', 'list']),
  }),
  { fetchList, fetchWebhooks }
)(AlertsList);

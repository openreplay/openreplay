import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { observer, useObserver } from 'mobx-react-lite';
import { Loader, NoContent, Pagination } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { InfoCircleOutlined } from '@ant-design/icons';
import { debounce } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted';
import { useModal } from 'App/components/Modal';
import Issue from 'App/mstore/types/issue';
import { List, Button } from 'antd';
import SessionsModal from '../SessionsModal';
import CardIssueItem from './CardIssueItem';
import { useTranslation } from 'react-i18next';

function CardIssues() {
  const { t } = useTranslation();
  const { metricStore, dashboardStore } = useStore();
  const [data, setData] = useState<{
    issues: Issue[];
    total: number;
  }>({ issues: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const widget: any = useObserver(() => metricStore.instance);
  const isMounted = useIsMounted();
  const pageSize = 5;
  const { showModal } = useModal();
  const filter = useObserver(() => dashboardStore.drillDownFilter);
  const hasFilters =
    filter.filters.length > 0 ||
    filter.startTimestamp !== dashboardStore.drillDownPeriod.start ||
    filter.endTimestamp !== dashboardStore.drillDownPeriod.end;
  const drillDownPeriod = useObserver(() => dashboardStore.drillDownPeriod);
  const depsString = JSON.stringify(widget.series);

  function getFilters(filter: any) {
    const mapSeries = (item: any) => {
      const filters = item.filter.filters.map((f: any) => f.toJson());

      return {
        ...item,
        filter: {
          ...item.filter,
          filters,
        },
      };
    };

    return {
      ...filter,
      limit: pageSize,
      page: filter.page,
      series: filter.series.map(mapSeries),
    };
  }

  const fetchIssues = async (filter: any) => {
    if (!isMounted()) return;

    setLoading(true);

    const newFilter = getFilters(filter);

    try {
      const res = await widget.fetchIssues(newFilter);
      setData(res);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const debounceRequest: any = React.useCallback(
    debounce(fetchIssues, 1000),
    [],
  );

  const handleClick = (issue?: any) => {
    // const filters = getFilters(widget.filter);
    showModal(<SessionsModal issue={issue} />, { right: true, width: 900 });
  };

  useEffect(() => {
    const newPayload = {
      ...widget,
      page: filter.page,
      limit: filter.limit,
      filters: filter.filters,
    };
    debounceRequest(newPayload);
  }, [
    drillDownPeriod,
    filter.filters,
    depsString,
    metricStore.sessionsPage,
    filter.page,
  ]);

  const clearFilters = () => {
    metricStore.updateKey('page', 1);
    dashboardStore.resetDrillDownFilter();
  };

  return useObserver(() => (
    <div className="bg-white rounded-lg shadow-sm p-4 border">
      <div className="flex justify-between">
        <div className="flex items-center">
          <h2 className="font-normal text-xl">{t('Issues')}</h2>
          {!!filter.filters[1] && (
            <div className="ml-3 pt-1">
              {t('Showing issues of')}{' '}
              <span className="font-medium">{filter.filters[0].value}</span>
              <span className="mx-1">{t('to')}</span>
              <span className="font-medium">{filter.filters[1].value}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {hasFilters && (
            <Button type="text" onClick={clearFilters}>
              {t('Clear Filters')}
            </Button>
          )}
          <Button type="text" onClick={() => handleClick()}>
            {t('All Sessions')}
          </Button>
        </div>
      </div>

      <Loader loading={loading}>
        <NoContent
          show={data.issues.length == 0}
          title={
            <div className="flex flex-col items-center justify-center">
              <AnimatedSVG name={ICONS.NO_RESULTS} size={60} />
              <div className="text-center my-4 text-base">
                <InfoCircleOutlined />
                &nbsp;{t('No data available.')}
              </div>
            </div>
          }
        >
          {/* {data.issues.map((item: any, index: any) => ( */}
          {/*  <div onClick={() => handleClick(item)} key={index}> */}
          {/*    <CardIssueItem issue={item} /> */}
          {/*  </div> */}
          {/* ))} */}
          <List
            itemLayout="horizontal"
            dataSource={data.issues}
            renderItem={(item: any) => (
              <List.Item onClick={() => handleClick(item)}>
                <CardIssueItem issue={item} />
              </List.Item>
            )}
          />
        </NoContent>
      </Loader>

      <div className="w-full flex items-center justify-between pt-4">
        <div className="text-disabled-text">
          {data.total && (
            <>
              {t('Showing')}{' '}
              <span className="font-medium">
                {(filter.page - 1) * pageSize + 1}
              </span>{' '}
              {t('to')}{' '}
              <span className="font-medium">
                {(filter.page - 1) * pageSize + pageSize}
              </span>{' '}
              {t('of')}&nbsp;<span className="font-medium">{data.total}</span>
              &nbsp;{t('issues')}.
            </>
          )}
        </div>

        <Pagination
          page={filter.page}
          total={data.total}
          onPageChange={(page: any) => filter.updateKey('page', page)}
          limit={widget.limit}
          debounceRequest={500}
        />
      </div>
    </div>
  ));
}

export default observer(CardIssues);

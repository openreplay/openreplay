import { filtersMap } from 'Types/filter/newFilter';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import 'App/components/Dashboard/charts.css';
import { useStore } from 'App/mstore';
import FilterItem from 'App/mstore/types/filterItem';
import { InsightIssue } from 'App/mstore/types/widget';
import {
  FilterKey,
  IssueCategory,
  IssueType,
} from 'App/types/filter/filterType';

import InsightItem from './InsightItem';

function InsightsCard({ data }: any) {
  const { dashboardStore } = useStore();
  const { drillDownFilter } = dashboardStore;
  const { t } = useTranslation();

  const clickHanddler = (
    e: React.MouseEvent<HTMLDivElement>,
    item: InsightIssue,
  ) => {
    let filter: any = {};
    switch (item.category) {
      case IssueCategory.RESOURCES:
        filter = {
          ...filtersMap[
            item.name === IssueType.MEMORY
              ? FilterKey.AVG_MEMORY_USAGE
              : FilterKey.AVG_CPU_LOAD
          ],
        };
        filter.source = [item.oldValue];
        filter.value = [];
        break;
      case IssueCategory.RAGE:
        filter = { ...filtersMap[FilterKey.CLICK] };
        filter.value = [item.name];
        break;
      case IssueCategory.NETWORK:
        filter = { ...filtersMap[FilterKey.FETCH] };
        filter.value = [];
        filter.filters.forEach((f: any) => {
          f.value = [];
          if (f.key === FilterKey.FETCH_URL) {
            f.value = [item.name];
          }

          if (f.key === FilterKey.FETCH_DURATION) {
            f.operator = '>=';
            f.value = [item.oldValue];
          }
        });
        break;
      case IssueCategory.ERRORS:
        filter = { ...filtersMap[FilterKey.ERROR] };
        filter.value = [item.name];
        break;
    }

    filter = new FilterItem(filter);
    drillDownFilter.merge({
      filters: [filter.toJson()],
    });
  };

  if (!data.issues || data.issues.length === 0) {
    return (
      <p className="m-funnel__empty">
        {t('No data available for the selected period.')}
      </p>
    );
  }

  return (
    <div className="m-insights overflow-y-auto" style={{ maxHeight: 240 }}>
      {data.issues.map((item: any) => (
        <InsightItem
          key={item.name}
          item={item}
          onClick={(e) => clickHanddler(e, item)}
        />
      ))}
    </div>
  );
}

export default observer(InsightsCard);

import { NoContent } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import React from 'react';
import InsightItem from './InsightItem';
import { NO_METRIC_DATA } from 'App/constants/messages';
import { InishtIssue } from 'App/mstore/types/widget';
import { FilterKey, IssueCategory, IssueType } from 'App/types/filter/filterType';
import { filtersMap } from 'Types/filter/newFilter';

function InsightsCard() {
  const { metricStore, dashboardStore } = useStore();
  const metric = metricStore.instance;
  const drillDownFilter = dashboardStore.drillDownFilter;
  const period = dashboardStore.period;

  const clickHanddler = (e: React.MouseEvent<HTMLDivElement>, item: InishtIssue) => {
    let filter: any = {};
    switch (item.category) {
      case IssueCategory.RESOURCES:
        filter = {
          ...filtersMap[
            item.name === IssueType.MEMORY ? FilterKey.AVG_MEMORY_USAGE : FilterKey.AVG_CPU_LOAD
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
        filter = { ...filtersMap[FilterKey.FETCH_URL] };
        filter.filters = [
          { ...filtersMap[FilterKey.FETCH_URL], value: [item.name] },
          { ...filtersMap[FilterKey.FETCH_DURATION], value: [item.oldValue] },
        ];
        filter.value = [];
        break;
      case IssueCategory.ERRORS:
        filter = { ...filtersMap[FilterKey.ERROR] };
        break;
    }

    filter.type = filter.key;
    delete filter.key;
    delete filter.operatorOptions;
    delete filter.sourceOperatorOptions;
    delete filter.placeholder;
    delete filter.sourcePlaceholder;
    delete filter.sourceType;
    delete filter.sourceUnit;
    delete filter.category;
    delete filter.icon;
    delete filter.label;
    delete filter.options;

    drillDownFilter.merge({
      filters: [filter],
    });
  };

  return (
    <NoContent
      show={metric.data.issues && metric.data.issues.length === 0}
      title={NO_METRIC_DATA}
      style={{ padding: '100px 0' }}
    >
      <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
        {metric.data.issues &&
          metric.data.issues.map((item: any) => (
            <InsightItem item={item} onClick={(e) => clickHanddler(e, item)} />
          ))}
      </div>
    </NoContent>
  );
}

export default observer(InsightsCard);

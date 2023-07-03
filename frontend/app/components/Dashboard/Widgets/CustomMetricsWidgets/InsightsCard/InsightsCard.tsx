import { NoContent, Icon } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import React from 'react';
import InsightItem from './InsightItem';
import { InishtIssue } from 'App/mstore/types/widget';
import FilterItem from 'App/mstore/types/filterItem';
import { FilterKey, IssueCategory, IssueType } from 'App/types/filter/filterType';
import { filtersMap } from 'Types/filter/newFilter';

function InsightsCard({ data }: any) {
  const { dashboardStore } = useStore();
  const drillDownFilter = dashboardStore.drillDownFilter;

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

  return (
    <NoContent
      style={{ minHeight: 220 }}
      title={
        <div className="flex items-center">
          <Icon name="info-circle" className="mr-2" size="18" />
          No data for selected period
        </div>
      }
      show={data.issues && data.issues.length === 0}
    >
      <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
        {data.issues &&
          data.issues.map((item: any) => (
            <InsightItem key={item.name} item={item} onClick={(e) => clickHanddler(e, item)} />
          ))}
      </div>
    </NoContent>
  );
}

export default observer(InsightsCard);

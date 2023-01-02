import React from 'react';
import MetricListItem from '../MetricListItem';
import WidgetWrapper from 'App/components/Dashboard/components/WidgetWrapper';

interface Props {
  list: any;
  siteId: any;
  selectedList: any;
  toggleSelection?: (metricId: any) => void;
}
function GridView(props: Props) {
  const { siteId, list, selectedList, toggleSelection } = props;
  return (
    <div className="grid grid-cols-4 gap-4 m-4">
      {list.map((metric: any) => (
        <React.Fragment key={metric.metricId}>
          <WidgetWrapper
            key={metric.metricId}
            widget={metric}
            active={selectedList.includes(metric.metricId)}
            isTemplate={true}
            isWidget={metric.metricType === 'predefined'}
            onClick={() => toggleSelection(parseInt(metric.metricId))}
          />
          {/* <MetricListItem
            metric={metric}
            siteId={siteId}
            selected={selectedList.includes(parseInt(metric.metricId))}
            toggleSelection={(e: any) => {
              e.stopPropagation();
              toggleSelection(parseInt(metric.metricId));
            }}
          /> */}
        </React.Fragment>
      ))}
    </div>
  );
}

export default GridView;

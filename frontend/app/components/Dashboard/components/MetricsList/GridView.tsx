import React from 'react';
import WidgetWrapper from 'App/components/Dashboard/components/WidgetWrapper';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { withSiteId } from 'App/routes';
interface Props extends RouteComponentProps {
  list: any;
  siteId: any;
  selectedList: any;
}
function GridView(props: Props) {
  const { siteId, list, selectedList, history } = props;

  const onItemClick = (metricId: number) => {
    const path = withSiteId(`/metrics/${metricId}`, siteId);
    history.push(path);
  };
  
  return (
    <div className="grid grid-cols-4 gap-4 m-4 items-start">
      {list.map((metric: any) => (
        <React.Fragment key={metric.metricId}>
          <WidgetWrapper
            key={metric.metricId}
            widget={metric}
            isGridView={true}
            active={selectedList.includes(metric.metricId)}
            isWidget={true}
            onClick={() => onItemClick(parseInt(metric.metricId))}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

export default withRouter(GridView);

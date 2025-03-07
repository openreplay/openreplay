import React from 'react';
import WidgetWrapper from 'App/components/Dashboard/components/WidgetWrapper';
import { withSiteId } from 'App/routes';
import { useNavigate } from "react-router";

interface Props {
  list: any;
  siteId: any;
  selectedList: any;
}
function GridView(props: Props) {
  const { siteId, list, selectedList } = props;
  const navigate = useNavigate();

  const onItemClick = (metricId: number) => {
    const path = withSiteId(`/metrics/${metricId}`, siteId);
    navigate(path);
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
            isSaved={true}
            onClick={() => onItemClick(parseInt(metric.metricId))}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

export default GridView;

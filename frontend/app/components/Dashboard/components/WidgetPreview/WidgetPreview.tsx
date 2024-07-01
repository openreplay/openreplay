import { Space, Switch } from 'antd';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { CLICKMAP, USER_PATH } from 'App/constants/card';
import { useStore } from 'App/mstore';
import ClickMapRagePicker from 'Components/Dashboard/components/ClickMapRagePicker';

import WidgetWrapper from '../WidgetWrapper';

interface Props {
  className?: string;
  name: string;
  isEditing?: boolean;
}

function WidgetPreview(props: Props) {
  const { className = '' } = props;
  const { metricStore, dashboardStore } = useStore();
  const metric: any = metricStore.instance;

  return (
    <>
      <div
        className={cn(className, 'bg-white rounded-xl border shadow-sm mt-0')}
      >
        <div className="flex items-center justify-between px-4 pt-2">
          <h2 className="text-xl">{props.name}</h2>
          <div className="flex items-center">
            {metric.metricType === USER_PATH && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  metric.update({ hideExcess: !metric.hideExcess });
                }}
              >
                <Space>
                  <Switch checked={metric.hideExcess} size="small" />
                  <span className="mr-4 color-gray-medium">
                    Hide Minor Paths
                  </span>
                </Space>
              </a>
            )}

            <div className="mx-4" />
            {metric.metricType === CLICKMAP ? <ClickMapRagePicker /> : null}
          </div>
        </div>
        <div className="pt-0">
          <WidgetWrapper
            widget={metric}
            isPreview={true}
            // isSaved={metric.exists()}
            hideName
          />
        </div>
      </div>
    </>
  );
}

export default observer(WidgetPreview);

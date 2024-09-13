import React from 'react';
import { HEATMAP, TABLE, USER_PATH } from 'App/constants/card';
import { Select, Space, Switch } from 'antd';
import { useStore } from 'App/mstore';
import ClickMapRagePicker from 'Components/Dashboard/components/ClickMapRagePicker/ClickMapRagePicker';
import { FilterKey } from 'Types/filter/filterType';
import { observer } from 'mobx-react-lite';

interface Props {

}


function WidgetOptions(props: Props) {
  const { metricStore, dashboardStore } = useStore();
  const metric: any = metricStore.instance;

  const handleChange = (value: any) => {
    metric.update({ metricFormat: value });
  };

  return (
    <div>
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

      {metric.metricType === TABLE && metric.metricOf != FilterKey.USERID && metric.metricOf != FilterKey.ERRORS &&  (
        <Select
          defaultValue={metric.metricFormat}
          onChange={handleChange}
          variant="borderless"
          options={[
            { value: 'sessionCount', label: 'Sessions' },
            { value: 'userCount', label: 'Users' }
          ]}
        />
      )}

      {metric.metricType === HEATMAP ? (
        <ClickMapRagePicker />
      ) : null}
    </div>
  );
}

export default observer(WidgetOptions);

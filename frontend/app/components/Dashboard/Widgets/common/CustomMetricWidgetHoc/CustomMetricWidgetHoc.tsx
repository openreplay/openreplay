import React from 'react';
import stl from './CustomMetricWidgetHoc.css';
import { Icon } from 'UI';

interface Props {
}
const CustomMetricWidgetHoc = ({ ...rest }: Props) => BaseComponent => {
  return (
    <div className={stl.wrapper}>
      <div className="flex items-center mb-10 p-2">
        <div className="font-medium">Widget Name</div>
        <div className="ml-auto">
          <div className="cursor-pointer">
            <Icon name="bell-plus" size="16" />
          </div>
        </div>
      </div>
      {/* <BaseComponent {...rest} /> */}
    </div>
  );
}

export default CustomMetricWidgetHoc;
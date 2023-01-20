import React from 'react';
import { Icon, Tooltip } from 'UI';

interface Props {
  className: string;
  icon: string;
  tooltip: string;
}
function WidgetIcon(props: Props) {
  const { className, icon, tooltip } = props;
  return (
    <Tooltip title={tooltip}>
      <div className={className}>
        {/* @ts-ignore */}
        <Icon name={icon} size="14" />
      </div>
    </Tooltip>
  );
}

export default WidgetIcon;

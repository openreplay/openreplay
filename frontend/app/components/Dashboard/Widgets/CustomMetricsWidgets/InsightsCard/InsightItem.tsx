import React from 'react';
import { Icon } from 'UI';

interface Props {
  item: any;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}
function InsightItem(props: Props) {
  const { item, onClick = () => {} } = props;
  return (
    <div
      className="flex items-center py-4 hover:bg-active-blue -mx-4 px-4 border-b last:border-transparent cursor-pointer"
      onClick={onClick}
    >
      <Icon name={item.icon} size={20} className="mr-2" color={item.iconColor} />
      <div className="mx-1 font-medium">{item.ratio}</div>
      <div className="mx-1">on</div>
      <div className="mx-1 bg-gray-100 px-2 rounded">Update</div>
      <div className="mx-1">increased by</div>
      <div className="font-medium text-red">{item.increase}</div>
    </div>
  );
}

export default InsightItem;

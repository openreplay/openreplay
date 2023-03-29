import { Icon } from 'UI';
import React from 'react';
import cn from 'classnames';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

function Category({
  name,
  healthOk,
  onClick,
  isSelectable,
  isExpandable,
  isExpanded,
  isSelected,
  isLoading,
  noBorder,
}: {
  name: string;
  healthOk?: boolean;
  isLoading?: boolean;
  onClick: (args: any) => void;
  isSelectable?: boolean;
  isExpandable?: boolean;
  isExpanded?: boolean;
  isSelected?: boolean;
  noBorder?: boolean;
}) {

  const icon = healthOk ? ('check-circle-fill' as const) : ('exclamation-circle-fill' as const);
  return (
    <div
      className={cn(
        'px-4 py-2 flex items-center gap-2',
        isExpandable || isSelectable ? 'hover:bg-active-blue cursor-pointer' : '',
        isSelected ? 'bg-active-blue' : '',
        noBorder ? '' : 'border-b',
      )}
      onClick={onClick}
    >
      {isLoading ? (
        <AnimatedSVG name={ICONS.LOADER} size={20} />
      ) : <Icon name={icon} size={20} color={'green'} />}
      {name}

      {isSelectable ? <Icon name={'chevron-right'} size={16} className={'ml-auto'} /> : null}
      {isExpandable ? (
        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} className={'ml-auto'} />
      ) : null}
    </div>
  );
}

export default Category
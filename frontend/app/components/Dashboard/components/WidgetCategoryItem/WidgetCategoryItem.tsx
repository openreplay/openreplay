import React from 'react';
import { useObserver } from 'mobx-react-lite';
import { Icon } from 'UI';
import cn from 'classnames';

interface IWiProps {
  category: Record<string, any>;
  onClick: (category: Record<string, any>) => void;
  isSelected: boolean;
  selectedWidgetIds: string[];
}

const ICONS: Record<string, string | null> = {
  errors: 'errors-icon',
  performance: 'performance-icon',
  resources: 'resources-icon',
  overview: null,
  custom: null,
};

export function WidgetCategoryItem({
  category,
  isSelected,
  onClick,
  selectedWidgetIds,
}: IWiProps) {
  const selectedCategoryWidgetsCount = useObserver(
    () =>
      category.widgets.filter((widget: any) =>
        selectedWidgetIds.includes(widget.metricId),
      ).length,
  );
  return (
    <div
      className={cn('rounded-sm p-4 border cursor-pointer hover:bg-active-blue', {
        'bg-active-blue border-blue': isSelected,
        'bg-white': !isSelected,
      })}
      onClick={() => onClick(category)}
    >
      <div className="font-medium text-lg mb-2 capitalize flex items-center">
        {/* @ts-ignore */}
        {ICONS[category.name] && (
          <Icon name={ICONS[category.name]} size={18} className="mr-2" />
        )}
        {category.name}
      </div>
      <div className="mb-2 text-sm leading-tight">{category.description}</div>
      {selectedCategoryWidgetsCount > 0 && (
        <div className="flex items-center">
          <span className="color-gray-medium text-sm">{`Selected ${selectedCategoryWidgetsCount} of ${category.widgets.length}`}</span>
        </div>
      )}
    </div>
  );
}

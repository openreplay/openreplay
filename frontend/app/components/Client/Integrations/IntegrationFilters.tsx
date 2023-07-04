import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';


// const FILTERS = [
//   { key: 'all', name: 'All', icon: 'play' },
//   { key: 'issue-reporting', name: 'Issue Reporting', icon: 'play' },
//   { key: 'backend-logging', name: 'Backend Logging', icon: 'play' },
//   { key: 'stack-tracing', name: 'Stack Tracing', icon: 'play' },
//   { key: 'state-management', name: 'State Management', icon: 'play' },
//   { key: 'collaboration', name: 'Collaboration', icon: 'play' },
//   { key: 'plugins', name: 'Plugins', icon: 'play' }
// ];

interface Props {
  onChange: any;
  activeItem: string;
  filters: any;
}

const allItem = { key: 'all', title: 'All', icon: 'play' };

function FilterButton(props: { activeItem: string, item: any, onClick: () => any }) {
  return <div
    className={cn('cursor-pointer transition group rounded px-2 py-1 flex items-center uppercase text-sm hover:bg-active-blue hover:text-teal', {
      'bg-active-blue text-teal': props.activeItem === props.item.key
    })}
    style={{ height: '36px' }}
    onClick={props.onClick}
  >
    {props.item.icon && <Icon name={props.item.icon} className='mr-2' />}
    <span>{props.item.title}</span>
  </div>;
}

function IntegrationFilters(props: Props) {

  return (
    <div className='flex items-center gap-4'>
      <FilterButton
        activeItem={props.activeItem}
        item={allItem}
        onClick={() => props.onChange(allItem.key)}
      />
      {props.filters.map((item: any) => (
        <FilterButton activeItem={props.activeItem} item={item} onClick={() => props.onChange(item.key)} />
      ))}
    </div>
  );
}

export default IntegrationFilters;
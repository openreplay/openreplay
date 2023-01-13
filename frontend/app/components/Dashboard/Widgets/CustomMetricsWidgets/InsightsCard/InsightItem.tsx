import { IssueCategory } from 'App/types/filter/filterType';
import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';

interface Props {
  item: any;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}
function InsightItem(props: Props) {
  const { item, onClick = () => {} } = props;
  const className =
    'flex items-center py-4 hover:bg-active-blue -mx-4 px-4 border-b last:border-transparent cursor-pointer';

  switch (item.category) {
    case IssueCategory.RAGE:
      return <RageItem onClick={onClick} item={item} className={className} />;
    case IssueCategory.RESOURCES:
      return <ResourcesItem onClick={onClick} item={item} className={className} />;
    case IssueCategory.ERRORS:
      return <ErrorItem onClick={onClick} item={item} className={className} />;
    case IssueCategory.NETWORK:
      return <NetworkItem onClick={onClick} item={item} className={className} />;
    default:
      return null;
  }
}

export default InsightItem;


function Change({ change, isIncreased }: any) {
  return (
    <div
      className={cn('font-medium flex items-center', {
        'text-red': isIncreased,
        'text-tealx': !isIncreased,
      })}
    >
      <Icon
        name={isIncreased ? 'arrow-up-short' : 'arrow-down-short'}
        color={isIncreased ? 'red' : 'tealx'}
        size={20}
      />
      {change}%
    </div>
  );
}

function ErrorItem({ item, className, onClick }: any) {
  return (
    <div className={className} onClick={onClick}>
      <Icon name={item.icon} size={20} className="mr-2" color={item.iconColor} />
      {item.isNew ? (
        <>
          <div className="mx-1 bg-gray-100 px-2 rounded">{item.name}</div>
          <div className="mx-1">error observed</div>
          <div className="mx-1 font-medium color-red">{item.ratio}%</div>
          <div className="mx-1">more than other new errors</div>
        </>
      ) : (
        <>
          <div className="mx-1">Increase</div>
          <div className="mx-1">in</div>
          <div className="mx-1">{item.name}</div>
          <Change change={item.change} isIncreased={item.isIncreased} />
        </>
      )}
    </div>
  );
}

function NetworkItem({ item, className, onClick }: any) {
  return (
    <div className={className} onClick={onClick}>
      <Icon name={item.icon} size={20} className="mr-2" color={item.iconColor} />
      <div className="mx-1">Network request</div>
      <div className="mx-1 bg-gray-100 px-2 rounded">{item.name}</div>
      <div className="mx-1">{item.change > 0 ? 'increased' : 'decreased'}</div>
      <Change change={item.change} isIncreased={item.isIncreased} />
    </div>
  );
}

function ResourcesItem({ item, className, onClick }: any) {
  return (
    <div className={className} onClick={onClick}>
      <Icon name={item.icon} size={20} className="mr-2" color={item.iconColor} />
      <div className="mx-1">{item.change > 0 ? 'Inrease' : 'Decrease'}</div>
      <div className="mx-1">in</div>
      <div className="mx-1 bg-gray-100 px-2 rounded">{item.name}</div>
      <Change change={item.change} isIncreased={item.isIncreased} />
    </div>
  );
}

function RageItem({ item, className, onClick }: any) {
  return (
    <div className={className} onClick={onClick}>
      <Icon name={item.icon} size={20} className="mr-2" color={item.iconColor} />
      <div className="mx-1 bg-gray-100 px-2 rounded">{item.isNew ? item.name : 'Click Rage'}</div>
      {item.isNew && <div className="mx-1">has</div>}
      {!item.isNew && <div className="mx-1">on</div>}
      {item.isNew && <div className="font-medium text-red">{item.ratio}%</div>}
      {item.isNew && <div className="mx-1">more clickrage than other raged elements.</div>}
      {!item.isNew && (
        <>
          <div className="mx-1">increase by</div>
          <Change change={item.change} isIncreased={item.isIncreased} />
        </>
      )}
    </div>
  );
}

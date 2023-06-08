import { IssueCategory } from 'App/types/filter/filterType';
import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import { numberWithCommas } from 'App/utils';

interface Props {
  item: any;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}
function InsightItem(props: Props) {
  const { item, onClick = () => {} } = props;
  const className =
    'whitespace-nowrap flex items-center py-4 hover:bg-active-blue -mx-4 px-4 border-b last:border-transparent cursor-pointer';

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

function Change({ change, isIncreased, unit = '%' }: any) {
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
        size={18}
      />
      {numberWithCommas(Math.abs(change)) + unit}
    </div>
  );
}

function ErrorItem({ item, className, onClick }: any) {
  return (
    <div className={className} onClick={onClick}>
      <Icon name={item.icon} size={18} className="mr-2" color={item.iconColor} />
      {item.isNew ? (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div>Users are encountering a new error called:</div>
          <div className="bg-gray-100 px-2 rounded">{item.name}</div>
          <div>This error has occurred a total of</div>
          <div className="font-medium color-red">{item.value}</div>
          <div>times</div>
        </div>
      ) : (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div>There has been an</div>
          <div>{item.isIncreased ? 'increase' : 'decrease'}</div>
          <div>in the error</div>
          <div className="bg-gray-100 px-2 rounded">{item.name}</div>
          <div>from</div>
          <div>{item.oldValue}</div>
          <div>to</div>
          <div>{item.value},</div>
          <div>representing a</div>
          <Change change={item.change} isIncreased={item.isIncreased} />
          <div>across all sessions.</div>
        </div>
      )}
    </div>
  );
}

function NetworkItem({ item, className, onClick }: any) {
  return (
    <div className={className} onClick={onClick}>
      <Icon name={item.icon} size={18} className="mr-2" color={item.iconColor} />
      <div className="flex items-center gap-2">
        <div>Network request to path</div>
        <div className="bg-gray-100 px-2 rounded">{item.name}</div>
        <div>has {item.change > 0 ? 'increased' : 'decreased'}</div>
        <Change change={item.change} isIncreased={item.isIncreased} unit="sec" />
      </div>
    </div>
  );
}

function ResourcesItem({ item, className, onClick }: any) {
  return (
    <div className={className} onClick={onClick}>
      <Icon name={item.icon} size={18} className="mr-2" color={item.iconColor} />
      <div className="flex items-center gap-2">
        <div>There has been</div>
        <div>{item.change > 0 ? 'Increase' : 'Decrease'}</div>
        <div>in</div>
        <div className="bg-gray-100 px-2 rounded">{item.name}</div>
        <div>usage by</div>
        <Change change={item.change} isIncreased={item.isIncreased} />
      </div>
    </div>
  );
}

function RageItem({ item, className, onClick }: any) {
  return (
    <div className={className} onClick={onClick}>
      <Icon name={item.icon} size={18} className="mr-2" color={item.iconColor} />
      {item.isNew ? (
        <div className="flex items-center gap-2">
          <div>New Click Rage detected</div>
          <div className="mx-1 bg-gray-100 px-2 rounded">{item.value}</div>
          <div>times on</div>
          <div className="mx-1 bg-gray-100 px-2 rounded">{item.name}</div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div>Click rage has</div>
          <div>{item.isIncreased ? 'increased' : 'decreased'} on</div>
          <div className="mx-1 bg-gray-100 px-2 rounded">{item.name}</div>
          <div>passing from</div>
          <div>{item.oldValue}</div>
          <div>to</div>
          <div>{item.value}</div>
          <div>representing a</div>
          <Change change={item.change} isIncreased={item.isIncreased} />
        </div>
      )}
    </div>
  );
}

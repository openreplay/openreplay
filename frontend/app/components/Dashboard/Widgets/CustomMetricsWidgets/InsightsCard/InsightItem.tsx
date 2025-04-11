import { IssueCategory } from 'App/types/filter/filterType';
import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import { numberWithCommas } from 'App/utils';
import { useTranslation } from 'react-i18next';

interface Props {
  item: any;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}
function InsightItem(props: Props) {
  const { item, onClick = () => {} } = props;
  const className =
    'flex items-start py-3 hover:bg-active-blue -mx-4 px-4 border-b last:border-transparent cursor-pointer';

  switch (item.category) {
    case IssueCategory.RAGE:
      return <RageItem onClick={onClick} item={item} className={className} />;
    case IssueCategory.RESOURCES:
      return (
        <ResourcesItem onClick={onClick} item={item} className={className} />
      );
    case IssueCategory.ERRORS:
      return <ErrorItem onClick={onClick} item={item} className={className} />;
    case IssueCategory.NETWORK:
      return (
        <NetworkItem onClick={onClick} item={item} className={className} />
      );
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
  const { t } = useTranslation();
  return (
    <div className={className} onClick={onClick}>
      <Icon
        name={item.icon}
        size={18}
        className="mr-2"
        color={item.iconColor}
      />
      {item.isNew ? (
        <div className="flex items-center gap-1 flex-wrap whitespace-nowrap">
          <div>{t('Users are encountering a new error called:')}</div>
          <div className="bg-gray-100 px-2 rounded">{item.name}</div>
          <div>{t('This error has occurred a total of')}</div>
          <div className="font-medium color-red">{item.value}</div>
          <div>{t('times')}</div>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-wrap whitespace-nowrap">
          <div>{t('There has been an')}</div>
          <div>{item.isIncreased ? t('increase') : t('decrease')}</div>
          <div>{t('in the error')}</div>
          <div className="bg-gray-100 px-2 rounded">{item.name}</div>
          <div>{t('from')}</div>
          <div>{item.oldValue}</div>
          <div>{t('to')}</div>
          <div>{item.value},</div>
          <div>{t('representing a')}</div>
          <Change change={item.change} isIncreased={item.isIncreased} />
          <div>{t('across all sessions.')}</div>
        </div>
      )}
    </div>
  );
}

function NetworkItem({ item, className, onClick }: any) {
  const { t } = useTranslation();
  return (
    <div className={className} onClick={onClick}>
      <Icon
        name={item.icon}
        size={18}
        className="mr-2"
        color={item.iconColor}
      />
      <div className="flex items-center gap-1 flex-wrap">
        <div>{t('Network request to path')}</div>
        <div className="bg-gray-100 px-2 rounded">{item.name}</div>
        <div>
          {t('has')}
          {item.change > 0 ? t('increased') : t('decreased')}
        </div>
        <Change
          change={item.change}
          isIncreased={item.isIncreased}
          unit="sec"
        />
      </div>
    </div>
  );
}

function ResourcesItem({ item, className, onClick }: any) {
  const { t } = useTranslation();
  return (
    <div className={className} onClick={onClick}>
      <Icon
        name={item.icon}
        size={18}
        className="mr-2"
        color={item.iconColor}
      />
      <div className="flex items-center gap-1 flex-wrap">
        <div>{t('There has been')}</div>
        <div>{item.change > 0 ? 'Increase' : 'Decrease'}</div>
        <div>{t('in')}</div>
        <div className="bg-gray-100 px-2 rounded">{item.name}</div>
        <div>{t('usage by')}</div>
        <Change change={item.change} isIncreased={item.isIncreased} />
      </div>
    </div>
  );
}

function RageItem({ item, className, onClick }: any) {
  const { t } = useTranslation();
  return (
    <div className={className} onClick={onClick}>
      <Icon
        name={item.icon}
        size={18}
        className="mr-2"
        color={item.iconColor}
      />
      {item.isNew ? (
        <div className="flex items-center gap-1 flex-wrap">
          <div>{t('New Click Rage detected')}</div>
          <div className="mx-1 bg-gray-100 px-2 rounded">{item.value}</div>
          <div>{t('times on')}</div>
          <div className="mx-1 bg-gray-100 px-2 rounded">{item.name}</div>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-wrap">
          <div>{t('Click rage has')}</div>
          <div>
            {item.isIncreased ? 'increased' : 'decreased'}&nbsp;{t('on')}
          </div>
          <div className="mx-1 bg-gray-100 px-2 rounded">{item.name}</div>
          <div>{t('passing from')}</div>
          <div>{item.oldValue}</div>
          <div>{t('to')}</div>
          <div>{item.value}</div>
          <div>{t('representing a')}</div>
          <Change change={item.change} isIncreased={item.isIncreased} />
        </div>
      )}
    </div>
  );
}

import { Icon } from '@/ui/icons/Icon';
import cn from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { IssueCategory } from 'App/types/filter/filterType';
import { numberWithCommas } from 'App/utils';

interface Props {
  item: any;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}
function InsightItem(props: Props) {
  const { item, onClick = () => {} } = props;
  const className =
    'flex items-start gap-2 py-3 px-4 text-sm text-content-primary border-b border-[var(--m-border-subtle)] last:border-transparent cursor-pointer hover:bg-[var(--m-surface-hover)]';

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
        'text-content-danger': isIncreased,
        'text-content-success': !isIncreased,
      })}
    >
      <Icon
        name={isIncreased ? 'arrow-up-short' : 'arrow-down-short'}
        color="inherit"
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
        className="shrink-0"
        color={item.iconColor}
      />
      {item.isNew ? (
        <div className="flex items-center gap-1 flex-wrap whitespace-nowrap">
          <div>{t('Users are encountering a new error called:')}</div>
          <div className="rounded-sm bg-[var(--m-surface-sunken)] px-2 font-mono text-xs">
            {item.name}
          </div>
          <div>{t('This error has occurred a total of')}</div>
          <div className="font-medium text-content-danger">{item.value}</div>
          <div>{t('times')}</div>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-wrap whitespace-nowrap">
          <div>{t('There has been an')}</div>
          <div>{item.isIncreased ? t('increase') : t('decrease')}</div>
          <div>{t('in the error')}</div>
          <div className="rounded-sm bg-[var(--m-surface-sunken)] px-2 font-mono text-xs">
            {item.name}
          </div>
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
        className="shrink-0"
        color={item.iconColor}
      />
      <div className="flex items-center gap-1 flex-wrap">
        <div>{t('Network request to path')}</div>
        <div className="rounded-sm bg-[var(--m-surface-sunken)] px-2 font-mono text-xs">
          {item.name}
        </div>
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
        className="shrink-0"
        color={item.iconColor}
      />
      <div className="flex items-center gap-1 flex-wrap">
        <div>{t('There has been')}</div>
        <div>{item.change > 0 ? 'Increase' : 'Decrease'}</div>
        <div>{t('in')}</div>
        <div className="rounded-sm bg-[var(--m-surface-sunken)] px-2 font-mono text-xs">
          {item.name}
        </div>
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
        className="shrink-0"
        color={item.iconColor}
      />
      {item.isNew ? (
        <div className="flex items-center gap-1 flex-wrap">
          <div>{t('New Click Rage detected')}</div>
          <div className="mx-1 rounded-sm bg-[var(--m-surface-sunken)] px-2 font-mono text-xs">
            {item.value}
          </div>
          <div>{t('times on')}</div>
          <div className="mx-1 rounded-sm bg-[var(--m-surface-sunken)] px-2 font-mono text-xs">
            {item.name}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-wrap">
          <div>{t('Click rage has')}</div>
          <div>
            {item.isIncreased ? 'increased' : 'decreased'}&nbsp;{t('on')}
          </div>
          <div className="mx-1 rounded-sm bg-[var(--m-surface-sunken)] px-2 font-mono text-xs">
            {item.name}
          </div>
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

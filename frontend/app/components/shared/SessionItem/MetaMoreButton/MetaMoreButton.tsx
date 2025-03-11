import React from 'react';
import { Button, Popover } from 'antd'
import MetaItem from '../MetaItem';
import { Icon } from 'UI'
import { useTranslation } from 'react-i18next';

interface Props {
  list: any[];
  maxLength: number;
}
export default function MetaMoreButton(props: Props) {
  const { list, maxLength } = props;
  const { t } = useTranslation();
  return (
    <Popover
      content={() => (
        <div
          className="text-sm grid grid-col gap-3 bg-white"
          style={{ maxHeight: '200px', overflowY: 'auto' }}
        >
          <span className="text-base">
            {list.length - maxLength}{' '}
            {t(`More ${list.length - maxLength === 1 ? "attribute" : "attributes"}`)}
          </span>
          {list.slice(maxLength).map(({ label, value }, index) => (
            <MetaItem key={index} label={label} value={value} />
          ))}
        </div>
      )}
      placement="bottom"
    >
      <div className="flex items-center">
        <Button type="text" size='small' className='text-sm text-neutral-400 px-0'>
          <Icon name="metadata-more" className="w-4 h-4" color={'black'} size={14} />
        </Button>
      </div>
    </Popover>
  );
}

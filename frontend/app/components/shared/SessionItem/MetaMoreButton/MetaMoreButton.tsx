import React from 'react';
import { Popover } from 'UI';
import { Button } from 'antd';
import MetaItem from '../MetaItem';
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
      render={() => (
        <div
          className="text-sm grid grid-col p-4 gap-3 bg-white"
          style={{ maxHeight: '200px', overflowY: 'auto' }}
        >
          {list.slice(maxLength).map(({ label, value }, index) => (
            <MetaItem key={index} label={label} value={value} />
          ))}
        </div>
      )}
      placement="bottom"
    >
      <div className="flex items-center">
        <Button variant="text">
          +{list.length - maxLength}
          {t('More')}
        </Button>
      </div>
    </Popover>
  );
}

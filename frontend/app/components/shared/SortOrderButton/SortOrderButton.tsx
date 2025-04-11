import React from 'react';
import { Segmented } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface Props {
  sortOrder: string;
  onChange?: (sortOrder: string) => void;
}

export default React.memo((props: Props) => {
  const { t } = useTranslation();
  const { sortOrder, onChange = () => null } = props;
  const isAscending = sortOrder === 'asc';

  return (
    <div className="rounded-full">
      <Segmented
        size="small"
        options={[
          { label: t('Ascending'), value: 'asc', icon: <ArrowUpOutlined /> },
          { label: t('Descending'), value: 'desc', icon: <ArrowDownOutlined /> },
        ]}
        defaultValue={sortOrder}
        onChange={onChange}
      />
    </div>
  );
});

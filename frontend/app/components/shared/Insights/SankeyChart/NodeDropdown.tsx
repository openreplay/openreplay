import React from 'react';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';

interface Props {
  payload: any;
}

function NodeDropdown(props: Props) {
  const { t } = useTranslation();
  return (
    <Select
      style={{ width: 120 }}
      placeholder={t('Select Event')}
      dropdownStyle={{
        border: 'none',
      }}
    >
      <Select.Option value="jack">{t('Jack')}</Select.Option>
      <Select.Option value="lucy">{t('Lucy')}</Select.Option>
    </Select>
  );
}

export default NodeDropdown;

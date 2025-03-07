import React from 'react';
import { Button, Tooltip } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface Props {
  loading?: boolean;
  onClick: () => void;
  iconSize?: number;
  buttonSize: 'small' | 'middle' | 'large' | undefined;
  label?: string
}
export default function ReloadButton(props: Props) {
  const { t } = useTranslation();
  const { loading, onClick, iconSize = 18, buttonSize } = props;
  return (
    <Tooltip title={t('Refresh')} placement="right">
      <Button
        type="default"
        size={buttonSize}
        onClick={onClick}
        icon={<SyncOutlined style={{ fontSize: iconSize }} />}
      >
        {props.label}
      </Button>
    </Tooltip>
  );
}

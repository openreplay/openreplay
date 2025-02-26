import React from 'react';
import { Button, Tooltip } from 'antd';
import { SyncOutlined } from '@ant-design/icons';

interface Props {
  loading?: boolean;
  onClick: () => void;
  iconSize?: number;
  buttonSize: 'small' | 'middle' | 'large' | undefined;
}
export default function ReloadButton(props: Props) {
  const {
    loading, onClick, iconSize = 18, buttonSize,
  } = props;
  return (
    <Tooltip title="Refresh" placement="right">
      <Button
        type="default"
        size={buttonSize}
        onClick={onClick}
        icon={<SyncOutlined style={{ fontSize: iconSize }} />}
      />
    </Tooltip>
  );
}

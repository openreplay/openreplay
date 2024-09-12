import React from 'react';
import {Button, Tooltip} from 'antd';
import { ListRestart } from 'lucide-react';

interface Props {
  loading?: boolean;
  onClick: () => void;
  iconSize?: number;
  buttonSize: 'small' | 'middle' | 'large' | undefined;
}
export default function ReloadButton(props: Props) {
  const { loading, onClick, iconSize = 18, buttonSize } = props;
  return (
    <Tooltip title="Refresh" placement='right'>
      <Button type="default" size={buttonSize} onClick={onClick}>
       <ListRestart size={iconSize} />
      </Button>
    </Tooltip>
  );
}

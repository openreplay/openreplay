import React from 'react';
import {Button, Tooltip} from 'antd';
import { ListRestart } from 'lucide-react';
import cn from 'classnames';

interface Props {
  loading?: boolean;
  onClick: () => void;
  iconSize?: number;
  iconName?: string;
  className?: string;
}
export default function ReloadButton(props: Props) {
  const { loading, onClick, iconSize = '20', iconName = 'arrow-repeat', className = '' } = props;
  return (
    <Tooltip title="Refresh" placement='right'>
      <Button  type="default" onClick={onClick}>
       <ListRestart size={18} />
      </Button>
    </Tooltip>
  );
}

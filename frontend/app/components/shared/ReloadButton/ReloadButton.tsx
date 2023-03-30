import React from 'react';
import { CircularLoader, Icon, Tooltip, Button } from 'UI';
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
    <Tooltip title="Refresh">
      <Button icon={iconName} variant="text" onClick={onClick}>
      </Button>
    </Tooltip>
  );
}

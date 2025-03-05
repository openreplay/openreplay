import React from 'react';
import { Popover as AntPopover } from 'antd';

interface Props {
  render: React.ReactNode | ((args: { close: () => void }) => React.ReactNode);
  placement?: string;
  children: React.ReactNode;
  onOpen?: () => void;
  onClose?: () => void;
}

function Popover({
  children,
  render,
  placement = 'top',
  onOpen,
  onClose,
}: Props) {
  const [visible, setVisible] = React.useState(false);

  const handleOpen = () => {
    setVisible(true);
    onOpen?.();
  };
  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  return (
    <AntPopover
      placement={placement}
      open={visible}
      content={() => render({ close: handleClose })}
      trigger="click"
      onOpenChange={(visible) => (visible ? handleOpen() : handleClose())}
    >
      {children}
    </AntPopover>
  );
}

export default Popover;

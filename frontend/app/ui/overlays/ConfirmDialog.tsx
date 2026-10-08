import type { ReactNode } from 'react';

import './dialogs.css';
import { Modal } from './modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;

  children: ReactNode;
  okText: string;
  cancelText?: string;
  danger?: boolean;
  onOk: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  okText,
  cancelText,
  danger = true,
  onOk,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      okText={okText}
      cancelText={cancelText}
      okVariant={danger ? 'danger' : 'primary'}
      onOk={onOk}
      width={440}
    >
      <p className="m-dlg__lede">{children}</p>
    </Modal>
  );
}

import {
  confirmable,
  createConfirmationCreater,
  createMountPoint,
  createReactTreeMounter,
} from 'react-confirm';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  show?: boolean;
  proceed?: (confirmed: boolean) => void;
  header?: string;
  confirmation?: string;
  cancelButton?: string;
  confirmButton?: string;
  /** red confirm button, for removals */
  danger?: boolean;
}

function Confirmation({
  show,
  proceed,
  header,
  confirmation,
  cancelButton,
  confirmButton,
  danger = false,
}: Props) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      title={header ?? t('Confirm')}
      open={!!show}
      onCancel={() => proceed?.(false)}
      onOk={() => proceed?.(true)}
      okText={confirmButton ?? t('Proceed')}
      cancelText={cancelButton ?? t('Cancel')}
      danger={danger}
    >
      {confirmation ?? t('Are you sure?')}
    </ConfirmDialog>
  );
}

/** Imperative `await confirm({...})`; dialogs render into `ConfirmMountPoint`. */
const mounter = createReactTreeMounter();
export const ConfirmMountPoint = createMountPoint(mounter);
export const confirm = createConfirmationCreater(mounter)(
  confirmable(Confirmation),
);

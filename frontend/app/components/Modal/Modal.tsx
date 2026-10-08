import { Drawer, type DrawerSize } from '@/ui/overlays/drawer';
import React, { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocation, useNavigationType } from 'App/routing';

export interface ModalProps {
  /** kept for callers; the drawer always opens on the right */
  right?: boolean;
  size?: DrawerSize;
  /** px; overrides `size` */
  width?: number;
  label?: string;
  className?: string;
  onClose?: () => void;
}

interface Props {
  component: ReactNode;
  props: ModalProps;
  hideModal: () => void;
}

/** The drawer behind `showModal`. Its content brings its own header. */
function Modal({ component, props, hideModal }: Props) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigationType = useNavigationType();
  // the last content stays painted while the sheet slides out
  const [shown, setShown] = useState({ component, props });
  if (component && component !== shown.component) {
    setShown({ component, props });
  }

  useEffect(() => {
    if (navigationType === 'PUSH') hideModal();
  }, [
    location.pathname,
    location.search,
    location.hash,
    navigationType,
    hideModal,
  ]);

  return (
    <Drawer
      open={!!component}
      onClose={hideModal}
      label={shown.props.label ?? t('Details')}
      size={shown.props.size}
      width={shown.props.width}
      className={shown.props.className}
    >
      {shown.component}
    </Drawer>
  );
}

export default Modal;

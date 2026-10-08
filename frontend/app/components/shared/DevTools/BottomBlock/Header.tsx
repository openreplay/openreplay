import { IconButton } from '@/ui/actions/IconButton';
import cn from 'classnames';
import { X } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

/** Set by a host that draws its own collapse control (the replay's devtools strip). */
export const PanelHostContext = React.createContext({ ownsClose: false });

function Header({
  children,
  className,
  onClose,
  customClose,
  showClose = true,
  customStyle,
}: {
  children?: React.ReactNode;
  className?: string;
  onFilterChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showClose?: boolean;
  onClose?: () => void;
  customClose?: () => void;
  customStyle?: React.CSSProperties;
}) {
  const { t } = useTranslation();
  const { uiPlayerStore } = useStore();
  const { ownsClose } = React.useContext(PanelHostContext);
  const close = onClose ?? customClose ?? uiPlayerStore.closeBottomBlock;
  return (
    <div className="m-dt__bar" style={customStyle}>
      <div className={cn('m-dt__bar-main', className)}>{children}</div>
      {showClose && !ownsClose ? (
        <IconButton
          icon={<X size={14} />}
          label={t('Close the panel')}
          variant="ghost"
          onClick={close}
        />
      ) : null}
    </div>
  );
}

Header.displayName = 'Header';

export default Header;

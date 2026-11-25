import { Button } from '@/ui/actions/button';
import { Modal } from '@/ui/overlays/modal';
import { useTranslation } from 'react-i18next';

import { AiTag } from './AiTag';
import { ArmadaMosaic } from './ArmadaMosaic';
import { PixelArrow } from './PixelArt';
import './ai.css';

export interface AiAccessDialogProps {
  open: boolean;
  onClose: () => void;
  onContact?: () => void;
}

export function AiAccessDialog({
  open,
  onClose,
  onContact,
}: AiAccessDialogProps) {
  const { t } = useTranslation();
  const contact =
    onContact ??
    (() => {
      window.open(
        'mailto:support@openreplay.com?subject=Armada%20access',
        '_blank',
      );
      onClose();
    });
  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={800}
      bare
      className="m-aiacc"
      title={t('Armada reads your sessions')}
    >
      <div className="m-aiacc__body">
        <ArmadaMosaic className="m-aiacc__art" />
        <div className="m-aiacc__copy">
          <AiTag size="md" />
          <h2 className="m-aiacc__title">
            <em>Armada</em> {t('reads')}
            <br />
            {t('your sessions')}
          </h2>
          <p className="m-aiacc__lead">
            {t(
              'Frustrations, quick wins and journeys, found in your replays. Support can add Armada to your account.',
            )}
          </p>
          <div className="m-aiacc__cta">
            <Button variant="primary" onClick={contact}>
              {t('Contact support')}
              <PixelArrow className="m-pxarrow" />
            </Button>
            <Button variant="subtle" onClick={onClose}>
              {t('Not now')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

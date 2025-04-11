import { useModal } from 'App/components/Modal';
import React from 'react';
import TrackingCodeModal from 'Shared/TrackingCodeModal';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

interface Props {
  site: any;
}
function InstallButton(props: Props) {
  const { t } = useTranslation();
  const { site } = props;
  const { showModal, hideModal } = useModal();
  const onClick = () => {
    showModal(
      <TrackingCodeModal
        title="Tracking Code"
        subTitle={`(Unique to ${site.host})`}
        onClose={hideModal}
        site={site}
      />,
      { right: true, width: 700 },
    );
  };
  return (
    <Button size="small" type="text" onClick={onClick}>
      {t('Installation Steps')}
    </Button>
  );
}

export default InstallButton;

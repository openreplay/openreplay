import { useModal } from 'App/components/Modal';
import React from 'react';
import SessionSettings from 'Shared/SessionSettings';
import { Icon, Tooltip } from 'UI';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

function SessionSettingButton(props: any) {
  const { t } = useTranslation();
  const { showModal } = useModal();

  const handleClick = () => {
    showModal(<SessionSettings />, { right: true, width: 450 });
  };

  return (
    <div className="cursor-pointer ml-4" onClick={handleClick}>
      <Tooltip title={t('Session Settings')}>
        <Button
          icon={<Icon name="sliders" />}
          type="text"
          id="btn-session-settings"
        />
      </Tooltip>
    </div>
  );
}

export default SessionSettingButton;

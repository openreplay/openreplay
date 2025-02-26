import { useModal } from 'App/components/Modal';
import React from 'react';
import SessionSettings from 'Shared/SessionSettings';
import { Icon, Tooltip } from 'UI';
import { Button } from 'antd';

function SessionSettingButton(props: any) {
  const { showModal } = useModal();

  const handleClick = () => {
    showModal(<SessionSettings />, { right: true, width: 450 });
  };

  return (
    <div className="cursor-pointer ml-4" onClick={handleClick}>
      <Tooltip title="Session Settings">
        <Button icon={<Icon name="sliders" />} type="text" id="btn-session-settings" />
      </Tooltip>
    </div>
  );
}

export default SessionSettingButton;

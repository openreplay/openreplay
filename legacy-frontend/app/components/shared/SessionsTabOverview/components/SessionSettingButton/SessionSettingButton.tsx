import { useModal } from 'App/components/Modal';
import React from 'react';
import SessionSettings from 'Shared/SessionSettings';
import { Button, Tooltip } from 'UI';

function SessionSettingButton(props: any) {
    const { showModal } = useModal();

    const handleClick = () => {
        showModal(<SessionSettings />, { right: true, width: 450 });
    };

    return (
        <div className="cursor-pointer ml-4" onClick={handleClick}>
            <Tooltip title="Session Settings">
                <Button icon="sliders" variant="text" id="btn-session-settings" />
            </Tooltip>
        </div>
    );
}

export default SessionSettingButton;

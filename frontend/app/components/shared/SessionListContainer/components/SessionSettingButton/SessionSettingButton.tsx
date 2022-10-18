import { useModal } from 'App/components/Modal';
import React from 'react';
import SessionSettings from 'Shared/SessionSettings';
import { Button } from 'UI';
import { Tooltip } from 'react-tippy';

function SessionSettingButton(props: any) {
    const { showModal } = useModal();

    const handleClick = () => {
        showModal(<SessionSettings />, { right: true });
    };

    return (
        <div className="cursor-pointer ml-4" onClick={handleClick}>
            {/* @ts-ignore */}
            <Tooltip title="Session Settings" unmountHTMLWhenHide>
                <Button icon="sliders" variant="text" />
            </Tooltip>
        </div>
    );
}

export default SessionSettingButton;

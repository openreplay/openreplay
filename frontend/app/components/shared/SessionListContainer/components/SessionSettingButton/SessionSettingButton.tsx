import { useModal } from 'App/components/Modal';
import React from 'react';
import SessionSettings from 'Shared/SessionSettings';
import { Button } from 'UI';

function SessionSettingButton(props: any) {
    const { showModal } = useModal();

    const handleClick = () => {
        showModal(<SessionSettings />, { right: true });
    };

    return (
        <div className="cursor-pointer ml-4" onClick={handleClick}>
            <Button icon="sliders" variant="text" />
        </div>
    );
}

export default SessionSettingButton;

import { useModal } from 'App/components/Modal';
import React from 'react';
import TrackingCodeModal from 'Shared/TrackingCodeModal';
import { Button } from 'UI';

interface Props {
    site: any;
}
function InstallButton(props: Props) {
    const { site } = props;
    const { showModal, hideModal } = useModal();
    const onClick = () => {
        showModal(
            <TrackingCodeModal title="Tracking Code" subTitle={`(Unique to ${site.host})`} onClose={hideModal} site={site} />,
            { right: true }
        );
    };
    return (
        <Button size="small" variant="text-primary" onClick={onClick}>
            {'Installation Steps'}
        </Button>
    );
}

export default InstallButton;

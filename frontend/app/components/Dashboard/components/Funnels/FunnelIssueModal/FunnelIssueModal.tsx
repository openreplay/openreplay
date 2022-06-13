import React from 'react';
import { withRouter } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { useModal } from 'App/components/Modal';

interface Props {
    
}
function FunnelIssueModal(props: Props) {
    const { hideModal } = useModal();
    return (
        <div style={{ width: '85vw', maxWidth: '1200px' }}>
            <div
                className="border-r shadow p-4 h-screen"
                style={{ backgroundColor: '#FAFAFA', zIndex: 999, width: '100%' }}
            >
            </div>
        </div>
    );
}

export default FunnelIssueModal;
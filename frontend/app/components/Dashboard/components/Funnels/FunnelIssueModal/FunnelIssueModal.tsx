import React from 'react';
import FunnelIssueDetails from '../FunnelIssueDetails';

interface Props {
    issueId: string;
}
function FunnelIssueModal(props: Props) {
    const { issueId } = props;
    return (
        <div style={{ width: '85vw', maxWidth: '1200px' }}>
            <div
                className="border-r shadow p-4 h-screen"
                style={{ backgroundColor: '#FAFAFA', zIndex: 999, width: '100%' }}
            >
                <FunnelIssueDetails issueId={issueId} />
            </div>
        </div>
    );
}

export default FunnelIssueModal;
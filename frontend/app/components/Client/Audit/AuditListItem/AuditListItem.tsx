import React from 'react';
import { checkForRecent } from 'App/date';

interface Props {
    audit: any;
    onShowDetails: () => void;
}
function AuditListItem(props: Props) {
    const { audit, onShowDetails } = props;
    return (
        <div className="grid grid-cols-12 py-4 px-5 border-t items-center select-none hover:bg-active-blue group">
            <div className="col-span-5">{audit.username}</div>
            <div className="col-span-4 link cursor-pointer select-none" onClick={onShowDetails}>{audit.action}</div>
            <div className="col-span-3">{audit.createdAt && checkForRecent(audit.createdAt, 'LLL dd, yyyy, hh:mm a')}</div>
        </div>
    );
}

export default AuditListItem;
import React from 'react';

interface Props {
    event: any;
}
function StackEventModal(props: Props) {
    return (
        <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
            Content
        </div>
    );
}

export default StackEventModal;

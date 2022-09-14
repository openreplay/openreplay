import React from 'react';
import ErrorInfo from '../../../../Errors/Error/ErrorInfo';

interface Props {
    errorId: any
}
function ErrorDetailsModal(props: Props) {
    return (
        <div
            style={{ width: '85vw', maxWidth: '1200px' }}
            className="bg-white h-screen p-4 overflow-y-auto"
        >
            <ErrorInfo errorId={props.errorId} />
        </div>
    );
}

export default ErrorDetailsModal;
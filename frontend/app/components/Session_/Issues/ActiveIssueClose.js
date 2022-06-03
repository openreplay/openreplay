import React from 'react';
import { connect } from 'react-redux';
import { Button } from 'UI';
import { resetActiveIsue } from 'Duck/issues';

const ActiveIssueClose = ({ resetActiveIsue }) => {
    return (
        <div className="absolute right-0 top-0 mr-4 mt-4">
            <Button
                variant="text"
                onClick={ resetActiveIsue }
            >
                Close
            </Button>
        </div>
    );
};

export default connect(null, {
    resetActiveIsue
})(ActiveIssueClose);

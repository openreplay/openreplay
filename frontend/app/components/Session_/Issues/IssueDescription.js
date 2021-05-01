import React from 'react';
import ContentRender from './ContentRender';

const IssueDescription = ({ className, description, provider }) => {
    return (
        <div className={ className }>
            <h5 className="mb-4">Description</h5>
            <ContentRender message={ description } provider={provider} />
        </div>
    );
};

export default IssueDescription;

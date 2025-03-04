import React from 'react';
import stl from './issuesModal.module.css';
import IssueForm from './IssueForm';

const IssuesModal = ({
  sessionId,
  closeHandler,
}) => {
  return (
    <div className={ stl.wrapper }>
      <h3 className="text-xl font-semibold">
        <span>Create Issue</span>
      </h3>
      <IssueForm sessionId={ sessionId } closeHandler={ closeHandler } />
    </div>
  );
}

export default IssuesModal;

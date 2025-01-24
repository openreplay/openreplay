import React from 'react';
import stl from './issuesModal.module.css';
import IssueForm from './IssueForm';
import cn from 'classnames'

const IssuesModal = ({
  sessionId,
  closeHandler,
}) => {
  return (
    <div className={cn(stl.wrapper, 'h-screen')}>
      <h3 className="text-xl font-semibold">
        <span>Create Issue</span>
      </h3>
      <IssueForm sessionId={ sessionId } closeHandler={ closeHandler } />
    </div>
  );
}

export default IssuesModal;

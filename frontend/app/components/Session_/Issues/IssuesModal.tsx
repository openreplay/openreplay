import React from 'react';
import cn from 'classnames';
import stl from './issuesModal.module.css';
import IssueForm from './IssueForm';

interface Props {
  sessionId: string;
  closeHandler: () => void;
}

function IssuesModal({
  sessionId,
  closeHandler,
}: Props) {
  return (
    <div className={cn(stl.wrapper, 'h-screen')}>
      <h3 className="text-xl font-semibold">
        <span>Create Issue</span>
      </h3>
      <IssueForm sessionId={sessionId} closeHandler={closeHandler} errors={[]} />
    </div>
  );
}

export default IssuesModal;

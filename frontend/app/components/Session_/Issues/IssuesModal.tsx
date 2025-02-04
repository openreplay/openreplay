import React from 'react';
import stl from './issuesModal.module.css';
import IssueForm from './IssueForm';
import cn from 'classnames';

interface Props {
  sessionId: string;
  closeHandler: () => void;
}

const IssuesModal = ({
                       sessionId,
                       closeHandler
                     }: Props) => {
  return (
    <div className={cn(stl.wrapper, 'h-screen')}>
      <h3 className="text-xl font-semibold">
        <span>Create Issue</span>
      </h3>
      <IssueForm sessionId={sessionId} closeHandler={closeHandler} errors={[]} />
    </div>
  );
};

export default IssuesModal;

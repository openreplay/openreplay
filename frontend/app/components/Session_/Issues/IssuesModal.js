import React from 'react';
import stl from './issuesModal.css';
import IssueForm from './IssueForm';
import { Icon } from 'UI';

const IssuesModal = React.forwardRef(({
  sessionId,
  closeHandler,
  provider
}) => {
  return (
    <div className={ stl.wrapper }>
      <h3 className="mb-6 text-lg flex items-center">
        {/* <Icon name={headerIcon} size="18" color="color-gray-darkest" />  */}
        <span>{`Report an Issue on ${provider === 'jira' ? 'Jira' : 'Github'}`}</span>
      </h3>
      <IssueForm sessionId={ sessionId } closeHandler={ closeHandler } />
    </div>
  );
})

export default IssuesModal;

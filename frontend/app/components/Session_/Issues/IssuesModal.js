import React from 'react';
import stl from './issuesModal.module.css';
import IssueForm from './IssueForm';
import { Provider } from 'react-redux';
import store from 'App/store';

const IssuesModal = ({
  sessionId,
  closeHandler,
}) => {
  return (
    <div className={ stl.wrapper }>
      <h3 className="text-xl font-semibold">
        <span>Create Issue</span>
      </h3>
      <Provider store={store}>
        <IssueForm sessionId={ sessionId } closeHandler={ closeHandler } />
      </Provider>
    </div>
  );
}

export default IssuesModal;

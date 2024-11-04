import { connect } from 'react-redux';
import React from 'react';
import cn from 'classnames';
import { Loader } from 'UI';
import IssueHeader from './IssueHeader';
import IssueCommentForm from './IssueCommentForm';
import IssueComment from './IssueComment';
import stl from './issueDetails.module.css';
import IssueDescription from './IssueDescription';

class IssueDetails extends React.PureComponent {
  state =  { searchQuery: ''}

  write = (e, { name, value }) => this.setState({ [ name ]: value });

  render() {
    const { sessionId, issue, loading, users, issueTypeIcons, issuesIntegration } = this.props;
    const activities = issue.activities;
    const provider = issuesIntegration.provider;
    const assignee = users.filter(({id}) => issue.assignee === id).first();

    return (
      <div className="flex flex-col">
        <Loader loading={ loading }>
          <div>
            <IssueHeader
              issue={ issue }
              typeIcon={ issueTypeIcons[issue.issueType] }
              assignee={ assignee }
              onSearchComment={ this.write }
            />
            <div className={ cn( stl.activitiesList, 'p-6') }>
              <IssueDescription
                className="mb-10"
                description={ issue.description }
                provider={provider}
              />
              
              { activities.size > 0 && <h5 className="mb-4">Comments</h5>}
              { activities.map(activity => (
                <IssueComment activity={ activity } key={activity.key} provider={provider} />
              ))}
            </div>
            <IssueCommentForm sessionId={ sessionId } issueId={ issue.id } />
          </div>
        </Loader>
      </div>
    );
  }
}

export default connect(state => ({
  users: state.getIn(['assignments', 'users']),
  loading: state.getIn(['assignments', 'fetchAssignment', 'loading']),
  issueTypeIcons: state.getIn(['assignments', 'issueTypeIcons']),
  issuesIntegration: state.getIn([ 'issues', 'list'])[0] || {},
}))(IssueDetails);

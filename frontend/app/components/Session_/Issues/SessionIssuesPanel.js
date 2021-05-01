import React from 'react';
import { connect } from 'react-redux';
import { getRE } from 'App/utils';
import { Input } from 'UI';
import IssueListItem from './IssueListItem';
import IssuesSortDropdown from './IssuesSortDropdown';

class SessionIssuesPanel extends React.Component {
  state = { search: '', closed: false, issueType: 'open' }
  write = ({ target: { value, name } }) => this.setState({ [ name ]: value });
  writeOption = (e, { name, value }) => this.setState({ [ name ]: value });
  
  render() {
    const { issueTypeIcons, users, activeIssue, issues = [], onIssueClick = () => null } = this.props;
    const { search, closed, issueType } = this.state;

    let filteredIssues = issues.filter(({ closed, title }) => getRE(search, 'i').test(title))
    if (!issueType !== '') {
      filteredIssues = filteredIssues.filter(({ closed }) => closed === ( this.state.issueType === 'closed'))
    }
      // .filter(({ closed }) => closed == this.state.closed);

    filteredIssues = filteredIssues.map(issue => {
      issue.user = users.filter(user => user.id === issue.assignee).first();
      return issue;
    });

    return (
      <div>
        <div className="p-3 bg-white flex items-center justify-between">
          <Input
            name="search"
            className="flex-1 mr-4"
            icon="search"
            iconPosition="left"
            placeholder="Search"
            onChange={ this.write }
          />
          <IssuesSortDropdown
            onChange={ this.writeOption }
            value={ issueType  }
          />
        </div>
        <div>
          { filteredIssues.map(issue => (
              <IssueListItem
                key={ issue.key }
                onClick={ () => onIssueClick(issue) }
                issue={ issue }
                icon={ issueTypeIcons[issue.issueType] }
                user={ issue.user }
                active={ activeIssue && activeIssue.id === issue.id }
              />
            ))
          }
        </div>
      </div>
    );
  }
}

export default connect(state => ({
  issues: state.getIn(['assignments', 'list']),
  issueTypeIcons: state.getIn(['assignments', 'issueTypeIcons']),
  users: state.getIn(['assignments', 'users']),
}))(SessionIssuesPanel);

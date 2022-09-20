import React from 'react';
import { connect } from 'react-redux';
import { Popup, Button, Icon } from 'UI';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import IssuesModal from './IssuesModal';
import { fetchProjects, fetchMeta } from 'Duck/assignments';
import stl from './issues.module.css';
import { Tooltip } from 'react-tippy'

@connect(state => ({
  issues: state.getIn(['assignments', 'list']),
  metaLoading: state.getIn(['assignments', 'fetchMeta', 'loading']),
  projects: state.getIn(['assignments', 'projects']),
  projectsFetched: state.getIn(['assignments', 'projectsFetched']),
  activeIssue: state.getIn(['assignments', 'activeIssue']),
  fetchIssueLoading: state.getIn(['assignments', 'fetchAssignment', 'loading']),
  fetchIssuesLoading: state.getIn(['assignments', 'fetchAssignments', 'loading']),
  projectsLoading: state.getIn(['assignments', 'fetchProjects', 'loading']),
  issuesIntegration: state.getIn([ 'issues', 'list']).first() || {},

  jiraConfig: state.getIn([ 'issues', 'list' ]).first(),
  issuesFetched: state.getIn([ 'issues', 'issuesFetched' ]),
}), { fetchMeta, fetchProjects })
class Issues extends React.Component {
  state = {showModal: false };

  constructor(props) {
    super(props);
    this.state = { showModal: false };
  }

  closeModal = () => {
    this.setState({ showModal: false });
  }

  showIssuesList = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ showModal: true });
  }

  handleOpen = () => {
    this.setState({ showModal: true });
    if (!this.props.projectsFetched) { // cache projects fetch
      this.props.fetchProjects().then(function() {
        const { projects } = this.props;
        if (projects && projects.first()) {
          this.props.fetchMeta(projects.first().id)
        }
      }.bind(this))
    }
  }

  render() {
    const {
      sessionId, isModalDisplayed, projectsLoading, metaLoading, fetchIssuesLoading, issuesIntegration
    } = this.props;
    const provider = issuesIntegration.provider

    return (
        <div className="relative">
          <div className={ stl.buttonWrapper} onClick={this.handleOpen}>
            <Tooltip
              open={this.state.showModal}
              position="bottom"
              interactive
              // animation="shift"
              trigger="click"
              unmountHTMLWhenHide
              // @ts-ignore
              theme='light'
              arrow
              html={
                <OutsideClickDetectingDiv onClickOutside={this.closeModal}>
                  <IssuesModal
                    provider={provider}
                    sessionId={ sessionId }
                    closeHandler={ this.closeModal }
                  />
                </OutsideClickDetectingDiv>
              }
            >
              <div className="flex items-center" onClick={this.handleOpen} disabled={!isModalDisplayed && (metaLoading || fetchIssuesLoading || projectsLoading)}>
                    <Icon name={ `integrations/${ provider === 'jira' ? 'jira' : 'github'}` } size="16" />
                    <span className="ml-2">Create Issue</span>
                </div>
            </Tooltip>
          </div>
        </div>
    );
  }
};

export default Issues;

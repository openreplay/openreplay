import React from 'react';
import { connect } from 'react-redux';
import { Popup, Button } from 'UI';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import IssuesModal from './IssuesModal';
import { fetchProjects, fetchMeta } from 'Duck/assignments';
import withToggle from 'HOCs/withToggle';
import stl from './issues.module.css';
import { fetchList as fetchListIntegration } from 'Duck/integrations/actions';

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
}), { fetchMeta, fetchProjects, fetchListIntegration })
@withToggle('isModalDisplayed', 'toggleModal')
class Issues extends React.Component {
  state = {showModal: false };

  componentDidMount() {
    if (!this.props.issuesFetched)
      this.props.fetchListIntegration('issues')
  }

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

  handleClose = () => {
    this.setState({ showModal: false });
  }

  handleOpen = () => {
    alert('test')
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
    const { showModal } = this.state;
    const provider = issuesIntegration.provider

    return (
      <div className="relative">
        <div className={ stl.buttonWrapper}>
          <Popup
            open={ isModalDisplayed }
            onOpen={ this.handleOpen }
            onClose={ this.handleClose }
            trigger={
                <div className="flex items-center" onClick={this.props.toggleModal} disabled={!isModalDisplayed && (metaLoading || fetchIssuesLoading || projectsLoading)}>
                  <Icon name={ `integrations/${ provider === 'jira' ? 'jira' : 'github'}` } size="16" />
                  <span className="ml-2">Create Issue</span>
                </div>
            }
            on="click"
            position="top right"
            content={
              <OutsideClickDetectingDiv onClickOutside={this.closeModal}>
                <IssuesModal
                  provider={provider}
                  sessionId={ sessionId }
                  closeHandler={ this.closeModal }
                />
              </OutsideClickDetectingDiv>
            }
            // trigger="click"
            theme="tippy-light"
          >
            {
              <Button
                variant="outline"
                onClick={ () => this.setState({ showModal: true }) }
                className={ stl.button }
                disabled={!isModalDisplayed && (metaLoading || fetchIssuesLoading || projectsLoading)}
                icon={`integrations/${ provider === 'jira' ? 'jira' : 'github'}`}
              >
                <div className="h-full flex items-center">
                  Report Issue
                </div>
              </Button>
            }
          </Popup>
        </div>
      </div>
    );
  }
};

export default Issues;

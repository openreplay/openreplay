import React from 'react';
import { connect } from 'react-redux';
// import cn from 'classnames';
import { SlideModal, Popup, Button, Icon, SplitButton } from 'UI';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import IssuesModal from './IssuesModal';
// import { fetchIssue } from 'Duck/issues';
import { fetchProjects, fetchAssignments, fetchMeta, fetchAssigment } from 'Duck/assignments';
import SessionIssuesPanel from './SessionIssuesPanel';
import IssueDetails from './IssueDetails';
import withToggle from 'HOCs/withToggle';
// import { withRequest } from 'HOCs';
import stl from './issues.css';

@connect(state => ({
  issues: state.getIn(['assignments', 'list']),
  metaLoading: state.getIn(['assignments', 'fetchMeta', 'loading']),
  projects: state.getIn(['assignments', 'projects']),
  projectsFetched: state.getIn(['assignments', 'projectsFetched']),
  activeIssue: state.getIn(['assignments', 'activeIssue']),
  fetchIssueLoading: state.getIn(['assignments', 'fetchAssignment', 'loading']),
  fetchIssuesLoading: state.getIn(['assignments', 'fetchAssignments', 'loading']),
  projectsLoading: state.getIn(['assignments', 'fetchProjects', 'loading']),
  provider: state.getIn([ 'issues', 'list']).provider,
}), { fetchAssigment, fetchAssignments, fetchMeta, fetchProjects })
@withToggle('isModalDisplayed', 'toggleModal')
class Issues extends React.Component {
  state = {showModal: false };

  constructor(props) {
    super(props);
    this.state = { showModal: false };
    if (!props.projectsFetched) { // cache projects fetch
      this.props.fetchProjects().then(function() {
        const { projects } = this.props;
        if (projects && projects.first()) {
          this.props.fetchMeta(projects.first().id)
        }
      }.bind(this))
    }
    this.props.fetchAssignments(this.props.sessionId)
  }
  
  closeModal = () => {
    if (!this.props.isModalDisplayed) return;
    this.props.toggleModal();
  }

  onIssueClick = (issue) => {
    const { sessionId } = this.props;
    this.setState({ showModal: true });
    this.props.fetchAssigment(sessionId, issue.id);
    
    if (this.props.isModalDisplayed)
      this.props.toggleModal();
  }

  showIssuesList = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ showModal: true });
  }  

  render() {
    const { 
      sessionId, activeIssue, isModalDisplayed, projectsLoading,
      fetchIssueLoading, issues, metaLoading, fetchIssuesLoading, provider
    } = this.props;
    const { showModal } = this.state;

    return (
      <div className="relative">
        <div className={ stl.buttonWrapper} >
          <Popup
            open={ isModalDisplayed }
            onOpen={ this.handleOpen }
            onClose={ this.handleClose }
            trigger={ issues.size === 0 ?
              <Button
                outline
                onClick={ this.props.toggleModal }
                className={ stl.button }
                size="small"
                disabled={!isModalDisplayed && (metaLoading || fetchIssuesLoading || projectsLoading)}
              >
                <div className="h-full flex items-center">
                  <Icon name={ `integrations/${ provider === 'jira' ? 'jira' : 'github'}` } size="16" color="teal" />
                  <span className="ml-2">Report Issue</span>
                </div>
              </Button>
              : <SplitButton
                  primary
                  disabled={!isModalDisplayed && (metaLoading || fetchIssuesLoading || projectsLoading)}
                  onIconClick={ this.props.toggleModal }
                  onButtonClick={ this.showIssuesList }
                  label="Issues"
                  icon="plus"
                />
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
          />
        </div>
      
        <SlideModal
          title={ `This session's issues` }
          size="small"
          isDisplayed={ showModal }
          content={ showModal &&
            <SessionIssuesPanel
              activeIssue={ activeIssue }
              onIssueClick={ this.onIssueClick }
            />
          }
          detailContent={ ((activeIssue && activeIssue.id) || fetchIssueLoading) &&
            <div style={ { width: '600px'} }>
              <IssueDetails issue={ activeIssue } sessionId={sessionId}/>
            </div>
          }
          onClose={ () => this.setState({ showModal: false }) }
        />
      </div>
    );
  }
};

export default Issues;

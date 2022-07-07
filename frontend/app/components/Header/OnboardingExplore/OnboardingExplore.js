import React from 'react';
import { connect } from 'react-redux';
import withToggle from 'Components/hocs/withToggle';
import stl from './onboardingExplore.module.css';
import FeatureItem from './FeatureItem';
import { getOnboard } from 'Duck/dashboard';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';

import { OB_TABS, onboarding as onboardingRoute } from 'App/routes'
import * as routes from '../../../routes'

const withSiteId = routes.withSiteId;

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { withRouter } from 'react-router';

const styles = {
  // Rotation of path and trail, in number of turns (0-1)
  rotation: 0,
  // Whether to use rounded or flat corners on the ends - can use 'butt' or 'round'
  strokeLinecap: 'butt',

  // Text size
  textSize: '16px',

  // How long animation takes to go from one percentage to another, in seconds
  pathTransitionDuration: 1,

  // Can specify path transition in more detail, or remove it entirely
  // pathTransition: 'none',

  // Colors
  pathColor: `#394EFF`,
  // textColor: '#f88',
  trailColor: '#d6d6d6',
  // backgroundColor: '#3e98c7',
};

@connect(state => ({
  siteId: state.getIn([ 'site', 'siteId' ]),
  boarding: state.getIn([ 'dashboard', 'boarding' ]),
  boardingCompletion: state.getIn([ 'dashboard', 'boardingCompletion' ]),
}), {
  getOnboard,
})
@withToggle('display', 'toggleModal')
@withRouter
class OnboardingExplore extends React.PureComponent {
  UNSAFE_componentWillMount() {
    if (this.props.boarding.size === 0) {
      this.props.getOnboard();
    }
  }

  componentDidMount() {    
    setTimeout(function() {      
      const { onComplete, boardingCompletion } = this.props;      
      if (typeof onComplete === 'function' && boardingCompletion >= 50) {        
        onComplete()        
      }
    }.bind(this), 1000 * 60 * 2);
  }
  
  onClickOutside = () => {
    if (this.props.display)
      this.props.toggleModal();
  }

  getHeaderText = (percentage) => {
    if (percentage === 0 ) {
      return 'Welcome!';
    } else if (percentage < 100) {
      return 'Few more steps and you’re done!';
    }
    return 'Good Job!';
  }

  getOnboardingTab = (task) => {
    if (task === 'Install OpenReplay')
      return OB_TABS.INSTALLING;
    if (task === 'Identify Users')
      return OB_TABS.IDENTIFY_USERS;
    if (task === 'Invite Team Members')
      return OB_TABS.MANAGE_USERS;
    if (task === 'Integrations')
      return OB_TABS.INTEGRATIONS;
  }
  onClick = task => {    
    const { siteId, history } = this.props;
    const tab = this.getOnboardingTab(task.task)    
    history.push(withSiteId(onboardingRoute(tab), siteId)); 
  }

  render() {
    const { display, toggleModal, boarding, boardingCompletion } = this.props;

    styles.pathColor = '#394EFF';
    if (boardingCompletion < 50)
      styles.pathColor = '#FF0000';
    else if (boardingCompletion < 75)
      styles.pathColor = '#FFA500';
    const _styles = buildStyles(styles);

    return (
      <OutsideClickDetectingDiv className={ stl.wrapper } onClickOutside={this.onClickOutside}>
        <button className={ stl.button } onClick={ toggleModal }>
          <div className={ stl.progressWrapper }>
            <CircularProgressbar value={ boardingCompletion } styles={ _styles } strokeWidth={ 12 }/>
          </div>
        </button>
        { display &&
          <div className={ stl.modal } >
            <div className={ stl.tooltipArrow } />
              <div className={ stl.header }>
              Make the best out of OpenReplay by completing your project setup:
              </div>

              <div className={ stl.content }>                
                <div className={ stl.list }>
                  { boarding.map(task => (
                    <FeatureItem
                      key={ task.task }
                      label={ task.task }
                      completed={ task.done }
                      onClick={() => this.onClick(task) }
                    />
                  ))}
                </div>
              </div>
          </div>
        }
      </OutsideClickDetectingDiv>
    );
  }
}

export default OnboardingExplore;

import React from 'react';
import stl from './announcements.module.css';
import ListItem from './ListItem';
import { connect } from 'react-redux';
import { SlideModal, Icon, NoContent, Popup } from 'UI';
import { fetchList, setLastRead } from 'Duck/announcements';
import withToggle from 'Components/hocs/withToggle';
import { withRouter } from 'react-router-dom';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

@withToggle('visible', 'toggleVisisble')
@withRouter
class Announcements extends React.Component {
  
  navigateToUrl = url => {
    if (url) {
      if (url.startsWith(window.env.ORIGIN || window.location.origin)) {
        const { history } = this.props;
        var path = new URL(url).pathname
        if (path.includes('/metrics')) {
          const { siteId, sites } = this.props;
          const activeSite = sites.find(s => s.id == siteId);
          history.push(`/${activeSite.id + path}`);
        } else {
          history.push(path)
        }
      } else {
        window.open(url, "_blank")
      }
      this.toggleModal()
    }
  }

  toggleModal = () => {
    if (!this.props.visible) {
      const { setLastRead, fetchList } = this.props;
      fetchList().then(() => { setTimeout(() => { setLastRead() }, 5000); });
    }
    this.props.toggleVisisble(!this.props.visible);
  }

  render() {
    const { announcements, visible, loading } = this.props;
    const unReadNotificationsCount = announcements.filter(({viewed}) => !viewed).size

    return (
      <div>
        <Popup content={ `Announcements` } >
          <div className={ stl.button } onClick={ this.toggleModal } data-active={ visible }>
            <div className={ stl.counter } data-hidden={ unReadNotificationsCount === 0 }>
              { unReadNotificationsCount }
            </div>
            <Icon name="bullhorn" size="18" />
          </div>
        </Popup>
        
        <SlideModal
          title="Announcements"
          right
          isDisplayed={ visible }
          onClose={ visible && this.toggleModal }
          bgColor="gray-lightest"
          size="small"
          content={ 
            <div className="mx-4">
              <NoContent
                  title={
                      <div className="flex flex-col items-center justify-center">
                        <AnimatedSVG name={ICONS.NO_ANNOUNCEMENTS} size={80} />
                        <div className="text-center text-gray-600 my-4">No announcements to show.</div>
                      </div>
                  }
                  size="small"
                  show={ !loading && announcements.size === 0 }
              >
                {
                  announcements.map(item => (
                    <ListItem
                      key={item.key}
                      announcement={item}
                      onButtonClick={this.navigateToUrl}
                    />
                  ))
                }
              </NoContent>
            </div>
          }
        />
      </div>
    );
  }
}

export default connect(state => ({
  announcements: state.getIn(['announcements', 'list']),
  loading: state.getIn(['announcements', 'fetchList', 'loading']),
  siteId: state.getIn([ 'site', 'siteId' ]),
  sites: state.getIn([ 'site', 'list' ]),
}), { fetchList, setLastRead })(Announcements);
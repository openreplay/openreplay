import React from 'react'
import { connect } from 'react-redux';
import { Tooltip } from 'react-tippy'
import cn from 'classnames';
import { SideMenuitem, SavedSearchList, Progress, Popup } from 'UI'
import stl from './sessionMenu.css';
import { clearEvents } from 'Duck/filters';
import { issues_types } from 'Types/session/issue'
import { fetchList as fetchSessionList } from 'Duck/sessions';
import { useModal } from 'App/components/Modal';
import SessionSettings from 'Shared/SessionSettings/SessionSettings'

function SessionsMenu(props) {
  const { activeTab } = props;
  const { showModal } = useModal();

  const onMenuItemClick = (filter) => {
    props.onMenuItemClick(filter)
  }

  return (
    <div className={stl.wrapper}>
      <div className={ cn(stl.header, 'flex items-center') }>
        <div className={ stl.label }>
          <span>Sessions</span>
        </div>
        <span className={ cn(stl.manageButton, 'mr-2') } onClick={() => showModal(<SessionSettings />, { right: true })}>
          <Tooltip
            delay={500}
            title="Configure the percentage of sessions to be captured, timezone and more."
            hideOnClick={true}
            position="bottom-end"
            tiny
          >
            Settings
          </Tooltip>
        </span>
        {/* { !capturingAll && (
          <Popup
            trigger={
              <div
                style={{ width: '120px' }}
                className="ml-6 cursor-pointer"
                onClick={ toggleRehydratePanel }
              >
                <Progress success percent={ props.captureRate.get('rate') } indicating size="tiny" />
              </div>
            }
            content={ `Capturing ${props.captureRate.get('rate')}% of all sessions. Click to manage capture rate. ` }
            size="tiny"
            inverted
            position="top right"
          />
        )}         */}
      </div>

      <div>
        <SideMenuitem
          active={activeTab.type === 'all'}
          title="All"
          iconName="play-circle"
          onClick={() => onMenuItemClick({ name: 'All', type: 'all' })}
        />
      </div>

      { issues_types.filter(item => item.visible).map(item => (
        <SideMenuitem
          key={item.key}
          // disabled={!keyMap[item.type] && !wdTypeCount[item.type]}
          active={activeTab.type === item.type}
          title={item.name} iconName={item.icon}
          onClick={() => onMenuItemClick(item)}
        />
      ))}

      <div className={stl.divider} />
      <div className="my-3">
        <SideMenuitem
          title="Bookmarks"
          iconName="star"
          active={activeTab.type === 'bookmark'}
          onClick={() => onMenuItemClick({ name: 'Bookmarks', type: 'bookmark' })}
        />
      </div>

      <div className={cn(stl.divider, 'mb-4')} />
      <SavedSearchList />
    </div>
  )
}

export default connect(state => ({
  activeTab: state.getIn([ 'search', 'activeTab' ]),
  keyMap: state.getIn([ 'sessions', 'keyMap' ]),
  wdTypeCount: state.getIn([ 'sessions', 'wdTypeCount' ]),
  captureRate: state.getIn(['watchdogs', 'captureRate']),
  filters: state.getIn([ 'filters', 'appliedFilter' ]),
  sessionsLoading: state.getIn([ 'sessions', 'fetchLiveListRequest', 'loading' ]),
}), {
  clearEvents, fetchSessionList
})(SessionsMenu);

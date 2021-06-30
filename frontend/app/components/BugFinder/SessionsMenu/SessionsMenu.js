import React, { useEffect } from 'react'
import { connect } from 'react-redux';
import cn from 'classnames';
import { SideMenuitem, SavedSearchList, Progress, Popup } from 'UI'
import stl from './sessionMenu.css';
import {  fetchWatchdogStatus } from 'Duck/watchdogs';
import { setActiveFlow, clearEvents } from 'Duck/filters';
import { setActiveTab } from 'Duck/sessions';
import { issues_types } from 'Types/session/issue'

function SessionsMenu(props) {
  const { 
    activeFlow, activeTab, watchdogs = [], keyMap, wdTypeCount,
    fetchWatchdogStatus, toggleRehydratePanel } = props;

  const onMenuItemClick = (filter) => {
    props.onMenuItemClick(filter)
    
    if (activeFlow && activeFlow.type === 'flows') {
      props.setActiveFlow(null)
    }
  }
  
  useEffect(() => {
    fetchWatchdogStatus()
  }, [])
  
  const capturingAll = props.captureRate && props.captureRate.get('captureAll');

  return (
    <div className={stl.wrapper}>
      <div className={ cn(stl.header, 'flex items-center') }>
        <div className={ stl.label }>
          <span>Sessions</span>
        </div>
        {capturingAll && <span className={ cn(stl.manageButton, 'mr-2') } onClick={ toggleRehydratePanel }>Manage</span>}        
        { !capturingAll && (
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
        )}        
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
          disabled={!keyMap[item.type] && !wdTypeCount[item.type]}
          active={activeTab.type === item.type}
          title={item.name} iconName={item.icon}
          onClick={() => onMenuItemClick(item)}
        />
      ))}

      <div className={stl.divider} />
      <div className="my-3">
        <SideMenuitem
          title="Assist"
          iconName="person"
          active={activeTab.type === 'live'}
          onClick={() => onMenuItemClick({ name: 'Assist', type: 'live' })}
        />
      </div>

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
  activeTab: state.getIn([ 'sessions', 'activeTab' ]),
  keyMap: state.getIn([ 'sessions', 'keyMap' ]),
  wdTypeCount: state.getIn([ 'sessions', 'wdTypeCount' ]),
  activeFlow: state.getIn([ 'filters', 'activeFlow' ]),
  captureRate: state.getIn(['watchdogs', 'captureRate']),
}), { 
  fetchWatchdogStatus, setActiveFlow, clearEvents, setActiveTab
})(SessionsMenu);

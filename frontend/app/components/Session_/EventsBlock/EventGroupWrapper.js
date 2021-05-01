import React from 'react'
import cn from 'classnames';

import { TextEllipsis } from 'UI';
import withToggle from 'HOCs/withToggle';
import { TYPES } from 'Types/session/event';
import Event from './Event'
import stl from './eventGroupWrapper.css';

// TODO: incapsulate toggler in LocationEvent
@withToggle("showLoadInfo", "toggleLoadInfo")
class EventGroupWrapper extends React.PureComponent {

  toggleLoadInfo = (e) => {
    e.stopPropagation();
    this.props.toggleLoadInfo();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.showLoadInfo !== this.props.showLoadInfo) {
      this.props.mesureHeight();
    }
  }
  componentDidMount() {
    this.props.toggleLoadInfo(this.props.isFirst)
    this.props.mesureHeight();
  }

  onEventClick = (e) => this.props.onEventClick(e, this.props.event); 

  onCheckboxClick = e => this.props.onCheckboxClick(e, this.props.event);

  onEditClick = e => this.props.onEditClick(e, this.props.event);

  render() {
    const {
      event,
      isLastEvent,
      isLastInGroup,
      isSelected,
      isCurrent,
      isEditing,
      showSelection,
      showLoadInfo,
      isFirst,
      presentInSearch
    } = this.props;
    const isLocation = event.type === TYPES.LOCATION;    

    return ( 
      <div 
        className={ 
          cn(stl.container, {
            [stl.last]: isLastInGroup,
            [stl.first]: event.type === TYPES.LOCATION,
            [stl.dashAfter]: isLastInGroup && !isLastEvent,
          })
        }
      >
        { isFirst && isLocation && event.referrer &&
          <div className={ stl.referrer }>
            {/* Referrer: <span className={stl.url}>{ event.referrer }</span> */}
            <TextEllipsis>
              Referrer: <span className={stl.url}>{ event.referrer }</span>
            </TextEllipsis>
          </div>
        }
        { isLocation
          ? <Event
              extended={isFirst}
              key={ event.key }
              event={ event }
              onClick={ this.onEventClick }
              selected={ isSelected }
              showLoadInfo={ showLoadInfo }
              toggleLoadInfo={ this.toggleLoadInfo }
              isCurrent={ isCurrent }
              presentInSearch={presentInSearch}
            />
          : <Event
              key={ event.key }
              event={ event }
              onClick={ this.onEventClick }
              onCheckboxClick={ this.onCheckboxClick }
              selected={ isSelected }
              isCurrent={ isCurrent }
              onEditClick={ this.onEditClick }
              showSelection={ showSelection }
              overlayed={ isEditing }              
              presentInSearch={presentInSearch}
            />
        }
      </div>
    )
  }
}

export default EventGroupWrapper

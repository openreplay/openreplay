import React, { useState } from 'react';
import FilterModal from '../FilterModal';
import LiveFilterModal from '../LiveFilterModal';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import { Icon } from 'UI';
import { connect } from 'react-redux';
import { assist as assistRoute, isRoute } from "App/routes";

const ASSIST_ROUTE = assistRoute();

interface Props {
  filter?: any; // event/filter
  onFilterClick: (filter) => void;
  children?: any;
  isLive?: boolean;
}
function FilterSelection(props: Props) {
  const { filter, onFilterClick, children, isLive = true } = props;
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="relative flex-shrink-0">
      <OutsideClickDetectingDiv
        className="relative"
        onClickOutside={ () => setTimeout(function() {
          setShowModal(false)
        }, 200)}
      >
        { children ? React.cloneElement(children, { onClick: (e) => {
          e.stopPropagation();
          e.preventDefault();
          setShowModal(true);
        }}) : (
          <div
            className="rounded py-1 px-3 flex items-center cursor-pointer bg-gray-lightest text-ellipsis hover:bg-gray-light-shade"
            style={{ width: '140px', height: '26px', border: 'solid thin #e9e9e9' }}
            onClick={() => setShowModal(true)}
          >
            <span className="mr-auto truncate">{filter.label}</span>
            <Icon name="chevron-down" size="14" />
          </div>
        ) }
      </OutsideClickDetectingDiv>
      {showModal && (
        <div className="absolute left-0 top-20 border shadow rounded bg-white z-50">
          { isRoute(ASSIST_ROUTE, window.location.pathname) ? <LiveFilterModal onFilterClick={onFilterClick}  /> : <FilterModal onFilterClick={onFilterClick} /> }
        </div>
      )}
    </div>
  );
}

export default connect(state => ({
  isLive: state.getIn([ 'sessions', 'activeTab' ]).type === 'live',
}), { })(FilterSelection);
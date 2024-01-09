import React, { useState } from 'react';
import FilterModal from '../FilterModal';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import { Icon } from 'UI';
import { connect } from 'react-redux';
import { assist as assistRoute, isRoute } from 'App/routes';
import cn from 'classnames';

const ASSIST_ROUTE = assistRoute();

interface Props {
  filter?: any; // event/filter
  filterList: any;
  filterListLive: any;
  onFilterClick: (filter: any) => void;
  children?: any;
  isLive?: boolean;
  excludeFilterKeys?: Array<string>;
  allowedFilterKeys?: Array<string>;
  disabled?: boolean;
  isConditional?: boolean;
}

function FilterSelection(props: Props) {
  const { filter, onFilterClick, children, excludeFilterKeys = [], allowedFilterKeys = [], disabled = false, isConditional } = props;
  const [showModal, setShowModal] = useState(false);

  return (
    <div className='relative flex-shrink-0'>
      <OutsideClickDetectingDiv
        className='relative'
        onClickOutside={() =>
          setTimeout(function() {
            setShowModal(false);
          }, 200)
        }
      >
        {children ? (
          React.cloneElement(children, {
            onClick: (e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowModal(true);
            },
            disabled: disabled
          })
        ) : (
          <div
            className={cn('rounded py-1 px-3 flex items-center cursor-pointer bg-gray-lightest text-ellipsis hover:bg-gray-light-shade', { 'opacity-50 pointer-events-none': disabled })}
            style={{ width: '150px', height: '26px', border: 'solid thin #e9e9e9' }}
            onClick={() => setShowModal(true)}
          >
            <div
              className='overflow-hidden whitespace-nowrap text-ellipsis mr-auto truncate'
              style={{ textOverflow: 'ellipsis' }}
            >
              {filter.label}
            </div>
            <Icon name='chevron-down' size='14' />
          </div>
        )}
      </OutsideClickDetectingDiv>
      {showModal && (
        <div className='absolute left-0 border shadow rounded bg-white z-50'>
          <FilterModal
            isLive={isRoute(ASSIST_ROUTE, window.location.pathname)}
            onFilterClick={onFilterClick}
            excludeFilterKeys={excludeFilterKeys}
            allowedFilterKeys={allowedFilterKeys}
            isConditional={isConditional}
          />
        </div>
      )}
    </div>
  );
}

export default connect(
  (state: any) => ({
    filterList: state.getIn(['search', 'filterList']),
    filterListLive: state.getIn(['search', 'filterListLive']),
    isLive: state.getIn(['sessions', 'activeTab']).type === 'live'
  }),
  {}
)(FilterSelection);

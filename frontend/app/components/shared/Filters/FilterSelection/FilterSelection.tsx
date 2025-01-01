import React, { useState } from 'react';
import FilterModal from '../FilterModal';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import { assist as assistRoute, isRoute } from 'App/routes';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import { getNewIcon } from "../FilterModal/FilterModal";

const ASSIST_ROUTE = assistRoute();

interface Props {
  filter?: any;
  onFilterClick: (filter: any) => void;
  children?: any;
  excludeFilterKeys?: Array<string>;
  allowedFilterKeys?: Array<string>;
  disabled?: boolean;
  isConditional?: boolean;
  isMobile?: boolean;
  mode: 'filters' | 'events';
}

function FilterSelection(props: Props) {
  const {
    filter,
    onFilterClick,
    children,
    excludeFilterKeys = [],
    allowedFilterKeys = [],
    disabled = false,
    isConditional,
    isMobile,
    mode,
  } = props;
  const [showModal, setShowModal] = useState(false);

  const onAddFilter = (filter: any) => {
    onFilterClick(filter);
    setShowModal(false);
  }

  const label = filter?.category === 'Issue' ? 'Issue' : filter?.label;
  return (
    <div className="relative flex-shrink-0 my-1.5">
      <OutsideClickDetectingDiv
        className="relative"
        onClickOutside={() => {
          setTimeout(() => {
            setShowModal(false);
          }, 0)
        }
        }
      >
        {children ? (
          React.cloneElement(children, {
            onClick: (e) => {
              setShowModal(true);
            },
            disabled: disabled,
          })
        ) : (
          <div
            className={cn(
              'rounded-lg py-1 px-2 flex items-center gap-1 cursor-pointer bg-white border border-gray-light text-ellipsis hover:border-neutral-400 btn-select-event',
              { 'opacity-50 pointer-events-none': disabled }
            )}
            style={{
              height: '26px',
            }}
            onClick={() => setShowModal(true)}
          >
            <div className='text-xs text-neutral-500/90 hover:border-neutral-400'>{getNewIcon(filter)}</div>
            <div className={'text-neutral-500/90 flex gap-2 hover:border-neutral-400 '}>{`${filter.category} •`}</div>
            <div
              className="rounded-lg overflow-hidden whitespace-nowrap text-ellipsis mr-auto truncate "
              style={{ textOverflow: 'ellipsis' }}
            >
              {label}
            </div>
          </div>
        )}
        {showModal && (
          <div className="absolute mt-2 left-0 rounded-2xl shadow-lg bg-white z-50">
            <FilterModal
              isLive={isRoute(ASSIST_ROUTE, window.location.pathname)}
              onFilterClick={onAddFilter}
              excludeFilterKeys={excludeFilterKeys}
              allowedFilterKeys={allowedFilterKeys}
              isConditional={isConditional}
              isMobile={isMobile}
              mode={mode}
            />
          </div>
        )}
      </OutsideClickDetectingDiv>
    </div>
  );
}

export default observer(FilterSelection);

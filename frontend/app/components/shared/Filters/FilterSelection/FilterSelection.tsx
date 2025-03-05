import React, { useState } from 'react';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import { assist as assistRoute, isRoute } from 'App/routes';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import FilterModal from '../FilterModal';
import { getNewIcon } from '../FilterModal/FilterModal';

const ASSIST_ROUTE = assistRoute();

interface Props {
  filter?: any;
  onFilterClick: (filter: any) => void;
  children?: any;
  excludeFilterKeys?: Array<string>;
  excludeCategory?: Array<string>;
  allowedFilterKeys?: Array<string>;
  disabled?: boolean;
  isConditional?: boolean;
  isMobile?: boolean;
  mode: 'filters' | 'events';
  isLive?: boolean;
}

function FilterSelection(props: Props) {
  const {
    filter,
    onFilterClick,
    children,
    excludeFilterKeys = [],
    excludeCategory = [],
    allowedFilterKeys = [],
    disabled = false,
    isConditional,
    isMobile,
    mode,
    isLive,
  } = props;
  const [showModal, setShowModal] = useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);

  const onAddFilter = (filter: any) => {
    onFilterClick(filter);
    setShowModal(false);
  };

  React.useEffect(() => {
    if (showModal && modalRef.current) {
      const modalRect = modalRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      if (modalRect.right > viewportWidth) {
        modalRef.current.style.left = 'unset';
        modalRef.current.style.right = '-280px';
      }
    }
  }, [showModal]);

  const label = filter?.category === 'Issue' ? 'Issue' : filter?.label;
  return (
    <div className="relative flex-shrink-0 my-1.5">
      <OutsideClickDetectingDiv
        className="relative"
        onClickOutside={() => {
          setTimeout(() => {
            setShowModal(false);
          }, 0);
        }}
      >
        {children ? (
          React.cloneElement(children, {
            onClick: (e) => {
              setShowModal(true);
            },
            disabled,
          })
        ) : (
          <div
            className={cn(
              'rounded-lg py-1 px-2 flex items-center gap-1 cursor-pointer bg-white border border-gray-light text-ellipsis hover:border-neutral-400 btn-select-event',
              { 'opacity-50 pointer-events-none': disabled },
            )}
            style={{
              height: '26px',
            }}
            onClick={() => setShowModal(true)}
          >
            <div className="text-xs text-neutral-500/90 hover:border-neutral-400">
              {getNewIcon(filter)}
            </div>
            <div className="text-neutral-500/90 flex gap-2 hover:border-neutral-400 ">{`${filter.subCategory ? filter.subCategory : filter.category} •`}</div>
            <div
              className="rounded-lg overflow-hidden whitespace-nowrap text-ellipsis mr-auto truncate "
              style={{ textOverflow: 'ellipsis' }}
            >
              {label}
            </div>
          </div>
        )}
        {showModal && (
          <div
            ref={modalRef}
            className="absolute mt-2 left-0 rounded-2xl shadow-lg bg-white z-50"
          >
            <FilterModal
              isLive={isRoute(ASSIST_ROUTE, window.location.pathname) || isLive}
              onFilterClick={onAddFilter}
              excludeFilterKeys={excludeFilterKeys}
              allowedFilterKeys={allowedFilterKeys}
              excludeCategory={excludeCategory}
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

import React, { useState } from 'react';
import FilterModal from '../FilterModal';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import { Icon } from 'UI';

interface Props {
  filter: any; // event/filter
  onFilterClick: (filter) => void;
  children?: any;
}
function FilterSelection(props: Props) {
  const { filter, onFilterClick, children } = props;
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="relative flex-shrink-0">
      <OutsideClickDetectingDiv
        className="relative"
        onClickOutside={ () => setTimeout(function() {
          setShowModal(false)
        }, 50)}
      >
        { children ? React.cloneElement(children, { onClick: () => setShowModal(true)}) : (
          <div
            className="rounded py-1 px-3 flex items-center cursor-pointer bg-gray-lightest text-ellipsis"
            style={{ width: '140px', height: '30px', border: 'solid thin rgba(34, 36, 38, 0.15)'}}
            onClick={() => setShowModal(true)}
          >
            <span className="mr-auto truncate">{filter.label}</span>
            <Icon name="chevron-down" size="14" />
          </div>
        ) }
      </OutsideClickDetectingDiv>
      {showModal && (
        <div className="absolute left-0 top-20 border shadow rounded bg-white z-50">
          <FilterModal onFilterClick={onFilterClick} />
        </div>
      )}
    </div>
  );
}

export default FilterSelection;
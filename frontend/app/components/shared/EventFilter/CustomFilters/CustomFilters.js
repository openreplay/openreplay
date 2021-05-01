import React, { useCallback, useState } from 'react';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import FilterModal from '../FilterModal';

export default React.memo(function CustomFilters({
  index,
  buttonComponent,
  filterType,
}) {
  const [ displayed, setDisplayed ] = useState(false);
  const close = useCallback(() => setDisplayed(false), []);
  const toggle = useCallback(() => setDisplayed(d => !d), []);

  return (
    <OutsideClickDetectingDiv className="relative" onClickOutside={ close }>
      <div role="button" onClick={ toggle }>{ buttonComponent ||  'Add Step' }</div>
      <FilterModal
        index={ index }
        close={ close }
        displayed={ displayed }
        filterType={ filterType }
      />
      
    </OutsideClickDetectingDiv>
  );
})
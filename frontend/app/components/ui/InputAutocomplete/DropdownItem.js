import stl from './dropdownItem.css';

const DropdownItem = ({ event }) => (
  <div className={ stl.wrapper }>
    <div className={ stl.values } data-type={ event.type }>
      { event.value }
    </div>
  </div>
);

DropdownItem.displayName = 'DropdownItem';

export default DropdownItem;

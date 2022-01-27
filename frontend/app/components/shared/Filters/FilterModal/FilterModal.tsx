import React from 'react';
import { Icon } from 'UI';
import { connect } from 'react-redux';
import cn from 'classnames';
import stl from './FilterModal.css';

interface Props {
  filters: any,
  onFilterClick?: (filter) => void
}
function FilterModal(props: Props) {
  const { filters, onFilterClick = () => null } = props;
  return (
    <div className={stl.wrapper} style={{ width: '490px', height: '400px', overflowY: 'auto'}}>
      <div className="" style={{ columns: "100px 2" }}>
        {filters && Object.keys(filters).map((key) => (
          <div className="mb-4">
            <div className="uppercase font-medium mb-1 color-gray-medium">{key}</div>
            <div>
              {filters[key].map((filter: any) => (
                <div className={cn(stl.optionItem, "flex items-center py-2 cursor-pointer -mx-2 px-2")} onClick={() => onFilterClick(filter)}>
                  <Icon name={filter.icon} size="16"/>
                  <span className="ml-2">{filter.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default connect(state => ({
  filters: state.getIn([ 'filters', 'filterList' ])
}))(FilterModal);
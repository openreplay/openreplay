import React from 'react';
import { Icon } from 'UI';
import { connect } from 'react-redux';

interface Props {
  filters: any,
  onFilterClick?: (filter) => void
}
function FilterModal(props: Props) {
  const { filters, onFilterClick = () => null } = props;
  return (
    <div className="border p-3" style={{ width: '490px', height: '400px', overflowY: 'auto'}}>
      <div className="grid grid-flow-row-dense grid-cols-2">
        {filters && Object.keys(filters).map((key) => (
          <div className="p-3">
            <div className="uppercase font-medium mb-1">{key}</div>
            <div>
              {filters[key].map((filter: any) => (
                <div className="flex items-center py-2 cursor-pointer hover:bg-gray-lightest -mx-2 px-2" onClick={() => onFilterClick(filter)}>
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
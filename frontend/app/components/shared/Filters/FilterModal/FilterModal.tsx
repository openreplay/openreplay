import React from 'react';
import { Icon } from 'UI';
import { connect } from 'react-redux';
import cn from 'classnames';
import stl from './FilterModal.css';
import { filtersMap } from 'Types/filter/newFilter';
import { FilterKey, FilterType } from 'Types/filter/filterType';

interface Props {
  filters: any,
  onFilterClick?: (filter) => void,
  filterSearchList: any,
  metaOptions: any,
}
function FilterModal(props: Props) {
  const { filters, metaOptions, onFilterClick = () => null, filterSearchList } = props;
  const hasFilerSearchList = filterSearchList && Object.keys(filterSearchList).length > 0;
  
  const allFilters = Object.assign({}, filtersMap);
  if (metaOptions.size > 0) {
    metaOptions.forEach((option) => {
      if (option.key) {
        allFilters[option.key] = {
          category: FilterKey.METADATA,
          key: option.key,
          name: option.key,
          label: option.key,
        };
      }
    });
  }

  const onFilterSearchClick = (filter) => {
    const _filter = filtersMap[filter.type];
    _filter.value = [filter.value];
    onFilterClick(_filter);
  }
  return (
    <div className={stl.wrapper} style={{ width: '490px', height: '400px', overflowY: 'auto'}}>
      { hasFilerSearchList && (
        <div className="border-b -mx-6 px-6 mb-3">
          { filterSearchList && Object.keys(filterSearchList).map((key, index) => {
            const filter = filterSearchList[key];
            const option = filtersMap[key];
            return (
              <div
                key={index}
                className={cn('mb-3')}
              >
                <div className="font-medium uppercase color-gray-medium text-sm mb-2">{option.label}</div>
                <div>
                  {filter.map((f, i) => (
                    <div
                      key={i}
                      className={cn(stl.filterSearchItem, "cursor-pointer px-3 py-1 text-sm flex items-center")}
                      onClick={() => onFilterSearchClick({ type: key, value: f.value })}
                    >
                      <Icon className="mr-2" name={option.icon} size="16" />
                      <div className="whitespace-nowrap text-ellipsis overflow-hidden">{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="" style={{ columns: "100px 2" }}>
        {filters && Object.keys(filters).map((key) => (
          <div className="mb-6">
            <div className="uppercase font-medium mb-1 color-gray-medium tracking-widest text-sm">{key}</div>
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
  filters: state.getIn([ 'filters', 'filterList' ]),
  filterSearchList: state.getIn([ 'search', 'filterSearchList' ]),
  metaOptions: state.getIn([ 'customFields', 'list' ]),
}))(FilterModal);
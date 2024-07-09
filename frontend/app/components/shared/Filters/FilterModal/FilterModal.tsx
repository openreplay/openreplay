import { filtersMap } from 'Types/filter/newFilter';
import cn from 'classnames';
import {
  AppWindow,
  ArrowUpDown,
  Chrome,
  CircleAlert,
  Clock2,
  Code,
  ContactRound, CornerDownRight,
  Cpu,
  Earth,
  FileStack, Layers,
  MapPin, Megaphone,
  MemoryStick,
  MonitorSmartphone,
  Navigation,
  Network,
  OctagonAlert,
  Pin,
  Pointer,
  RectangleEllipsis,
  SquareMousePointer,
  SquareUser,
  Timer,
  VenetianMask,
  Workflow,
  Flag,
} from 'lucide-react';
import React from 'react';
import { connect } from 'react-redux';
import { Icon, Loader } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import { FilterKey } from '../../../../types/filter/filterType';
import stl from './FilterModal.module.css';

const IconMap = {
  [FilterKey.CLICK]: <Pointer size={18} />,
  [FilterKey.LOCATION]: <Navigation size={18} />,
  [FilterKey.INPUT]: <RectangleEllipsis size={18} />,
  [FilterKey.CUSTOM]: <Code size={18} />,
  [FilterKey.FETCH]: <ArrowUpDown size={18} />,
  [FilterKey.GRAPHQL]: <Network size={18} />,
  [FilterKey.STATEACTION]: <RectangleEllipsis size={18} />,
  [FilterKey.ERROR]: <OctagonAlert size={18} />,
  [FilterKey.ISSUE]: <CircleAlert size={18} />,
  [FilterKey.FETCH_FAILED]: <Code size={18} />,
  [FilterKey.DOM_COMPLETE]: <ArrowUpDown size={18} />,
  [FilterKey.LARGEST_CONTENTFUL_PAINT_TIME]: <Network size={18} />,
  [FilterKey.TTFB]: <Timer size={18} />,
  [FilterKey.AVG_CPU_LOAD]: <Cpu size={18} />,
  [FilterKey.AVG_MEMORY_USAGE]: <MemoryStick size={18} />,
  [FilterKey.USERID]: <SquareUser size={18} />,
  [FilterKey.USERANONYMOUSID]: <VenetianMask size={18} />,
  [FilterKey.USER_CITY]: <Pin size={18} />,
  [FilterKey.USER_STATE]: <MapPin size={18} />,
  [FilterKey.USER_COUNTRY]: <Earth size={18} />,
  [FilterKey.USER_DEVICE]: <Code size={18} />,
  [FilterKey.USER_OS]: <AppWindow size={18} />,
  [FilterKey.USER_BROWSER]: <Chrome size={18} />,
  [FilterKey.PLATFORM]: <MonitorSmartphone size={18} />,
  [FilterKey.REVID]: <FileStack size={18} />,
  [FilterKey.REFERRER]: <Workflow size={18} />,
  [FilterKey.DURATION]: <Clock2 size={18} />,
  [FilterKey.TAGGED_ELEMENT]: <SquareMousePointer size={18} />,
  [FilterKey.METADATA]: <ContactRound size={18} />,
  [FilterKey.UTM_SOURCE]: <CornerDownRight size={18}/>,
  [FilterKey.UTM_MEDIUM]: <Layers size={18}/>,
  [FilterKey.UTM_CAMPAIGN]: <Megaphone size={18}/>,
  [FilterKey.FEATURE_FLAG]: <Flag size={18}/>,
};

function filterJson(
  jsonObj: Record<string, any>,
  excludeKeys: string[] = [],
  allowedFilterKeys: string[] = []
): Record<string, any> {
  return Object.fromEntries(
    Object.entries(jsonObj)
      .map(([key, value]) => {
        const arr = value.filter((i: { key: string }) => {
          if (excludeKeys.includes(i.key)) return false;
          return !(
            allowedFilterKeys.length > 0 && !allowedFilterKeys.includes(i.key)
          );
        });
        return [key, arr];
      })
      .filter(([_, arr]) => arr.length > 0)
  );
}

export const getMatchingEntries = (
  searchQuery: string,
  filters: Record<string, any>
) => {
  const matchingCategories: string[] = [];
  const matchingFilters: Record<string, any> = {};
  const lowerCaseQuery = searchQuery.toLowerCase();

  if (lowerCaseQuery.length === 0)
    return {
      matchingCategories: Object.keys(filters),
      matchingFilters: filters,
    };

  Object.keys(filters).forEach((name) => {
    if (name.toLocaleLowerCase().includes(lowerCaseQuery)) {
      matchingCategories.push(name);
      matchingFilters[name] = filters[name];
    } else {
      const filtersQuery = filters[name].filter((filterOption: any) =>
        filterOption.label.toLocaleLowerCase().includes(lowerCaseQuery)
      );

      if (filtersQuery.length > 0) matchingFilters[name] = filtersQuery;
      filtersQuery.length > 0 && matchingCategories.push(name);
    }
  });

  return { matchingCategories, matchingFilters };
};

interface Props {
  filters: any;
  conditionalFilters: any;
  mobileConditionalFilters: any;
  onFilterClick?: (filter: any) => void;
  filterSearchList: any;
  isMainSearch?: boolean;
  fetchingFilterSearchList: boolean;
  searchQuery?: string;
  excludeFilterKeys?: Array<string>;
  allowedFilterKeys?: Array<string>;
  isConditional?: boolean;
  isMobile?: boolean;
}

function FilterModal(props: Props) {
  const {
    filters,
    conditionalFilters,
    mobileConditionalFilters,
    onFilterClick = () => null,
    filterSearchList,
    isMainSearch = false,
    fetchingFilterSearchList,
    searchQuery = '',
    excludeFilterKeys = [],
    allowedFilterKeys = [],
    isConditional,
    isMobile,
  } = props;
  const showSearchList = isMainSearch && searchQuery.length > 0;

  const onFilterSearchClick = (filter: any) => {
    const _filter = { ...filtersMap[filter.type] };
    _filter.value = [filter.value];
    onFilterClick(_filter);
  };

  const filterJsonObj = isConditional
                        ? isMobile ? mobileConditionalFilters : conditionalFilters
                        : filters;
  const { matchingCategories, matchingFilters } = getMatchingEntries(
    searchQuery,
    filterJson(filterJsonObj, excludeFilterKeys, allowedFilterKeys)
  );

  const isResultEmpty =
    (!filterSearchList || Object.keys(filterSearchList).length === 0) &&
    matchingCategories.length === 0 &&
    Object.keys(matchingFilters).length === 0;

  const getNewIcon = (filter: Record<string, any>) => {
    if (filter.icon?.includes('metadata')) {
      return IconMap[FilterKey.METADATA]
    }
    // @ts-ignore
    if (IconMap[filter.key]) {
      // @ts-ignore
      return IconMap[filter.key]
    }
    else return <Icon name={filter.icon} size={16} />
  }
  return (
    <div
      className={stl.wrapper}
      style={{ width: '480px', maxHeight: '380px', overflowY: 'auto' }}
    >
      <div
        className={searchQuery && !isResultEmpty ? 'mb-6' : ''}
        style={{ columns: matchingCategories.length > 1 ? 'auto 200px' : 1 }}
      >
        {matchingCategories.map((key) => {
          return (
            <div
              className="mb-6 flex flex-col gap-2 break-inside-avoid"
              key={key}
            >
              <div className="uppercase font-medium mb-1 color-gray-medium tracking-widest text-sm">
                {key}
              </div>
              <div>
                {matchingFilters[key] &&
                  matchingFilters[key].map((filter: Record<string, any>) => (
                    <div
                      key={filter.label}
                      className={cn(
                        stl.optionItem,
                        'flex items-center py-2 cursor-pointer -mx-2 px-2 gap-2'
                      )}
                      onClick={() => onFilterClick({ ...filter, value: [''] })}
                    >
                      {getNewIcon(filter)}
                      <span>{filter.label}</span>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
      {showSearchList && (
        <Loader loading={fetchingFilterSearchList}>
          <div className="-mx-6 px-6">
            {isResultEmpty && !fetchingFilterSearchList ? (
              <div className="flex items-center flex-col">
                <AnimatedSVG name={ICONS.NO_SEARCH_RESULTS} size={180} />
                <div className="color-gray-medium font-medium px-3">
                  {' '}
                  No Suggestions Found
                </div>
              </div>
            ) : (
              Object.keys(filterSearchList).map((key, index) => {
                const filter = filterSearchList[key];
                const option = filtersMap[key];
                return option ? (
                  <div key={index} className={cn('mb-3')}>
                    <div className="font-medium uppercase color-gray-medium mb-2">
                      {option.label}
                    </div>
                    <div>
                      {filter.map((f, i) => (
                        <div
                          key={i}
                          className={cn(
                            stl.filterSearchItem,
                            'cursor-pointer px-3 py-1 flex items-center gap-2'
                          )}
                          onClick={() =>
                            onFilterSearchClick({ type: key, value: f.value })
                          }
                        >
                          {getNewIcon(option)}
                          <div className="whitespace-nowrap text-ellipsis overflow-hidden">
                            {f.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <></>
                );
              })
            )}
          </div>
        </Loader>
      )}
    </div>
  );
}

export default connect((state: any, props: any) => {
  return {
    filters: props.isLive
      ? state.getIn(['search', 'filterListLive'])
      : state.getIn(['search', 'filterList']),
    conditionalFilters: state.getIn(['search', 'filterListConditional']),
    mobileConditionalFilters: state.getIn(['search', 'filterListMobileConditional']),
    filterSearchList: props.isLive
      ? state.getIn(['liveSearch', 'filterSearchList'])
      : state.getIn(['search', 'filterSearchList']),
    fetchingFilterSearchList: props.isLive
      ? state.getIn(['liveSearch', 'fetchFilterSearch', 'loading'])
      : state.getIn(['search', 'fetchFilterSearch', 'loading']),
  };
})(FilterModal);

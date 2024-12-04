import { filtersMap } from 'Types/filter/newFilter';
import cn from 'classnames';
import {
  AppWindow,
  ArrowUpDown,
  Chrome,
  CircleAlert,
  Clock2,
  Code,
  ContactRound,
  CornerDownRight,
  Cpu,
  Earth,
  FileStack,
  Layers,
  MapPin,
  Megaphone,
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
  ChevronRight,
} from 'lucide-react';
import React from 'react';
import { Icon, Loader } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Input } from 'antd';

import { FilterKey } from 'Types/filter/filterType';
import stl from './FilterModal.module.css';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

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
  [FilterKey.UTM_SOURCE]: <CornerDownRight size={18} />,
  [FilterKey.UTM_MEDIUM]: <Layers size={18} />,
  [FilterKey.UTM_CAMPAIGN]: <Megaphone size={18} />,
  [FilterKey.FEATURE_FLAG]: <Flag size={18} />,
};

function filterJson(
  jsonObj: Record<string, any>,
  excludeKeys: string[] = [],
  allowedFilterKeys: string[] = [],
  mode: 'filters' | 'events'
): Record<string, any> {
  return Object.fromEntries(
    Object.entries(jsonObj)
      .map(([key, value]) => {
        const arr = value.filter((i: { key: string, isEvent: boolean }) => {
          if (excludeKeys.includes(i.key)) return false;
          if (mode === 'events' && !i.isEvent) return false;
          if (mode === 'filters' && i.isEvent) return false;
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
      matchingCategories: ['ALL', ...Object.keys(filters)],
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

  return { matchingCategories: ['ALL', ...matchingCategories], matchingFilters };
};

interface Props {
  isLive: boolean;
  conditionalFilters: any;
  mobileConditionalFilters: any;
  onFilterClick?: (filter: any) => void;
  isMainSearch?: boolean;
  searchQuery?: string;
  excludeFilterKeys?: Array<string>;
  allowedFilterKeys?: Array<string>;
  isConditional?: boolean;
  isMobile?: boolean;
  mode: 'filters' | 'events';
}

export const getNewIcon = (filter: Record<string, any>) => {
  if (filter.icon?.includes('metadata')) {
    return IconMap[FilterKey.METADATA];
  }
  // @ts-ignore
  if (IconMap[filter.key]) {
    // @ts-ignore
    return IconMap[filter.key];
  } else return <Icon name={filter.icon} size={16} />;
};

function FilterModal(props: Props) {
  const {
    isLive,
    onFilterClick = () => null,
    isMainSearch = false,
    excludeFilterKeys = [],
    allowedFilterKeys = [],
    isConditional,
    mode,
  } = props;
  const [searchQuery, setSearchQuery] = React.useState('');
  const [category, setCategory] = React.useState('ALL');
  const { searchStore, searchStoreLive, projectsStore } = useStore();
  const isMobile = projectsStore.active?.platform === 'ios'; // TODO - should be using mobile once the app is changed
  const filters = isLive
    ? searchStoreLive.filterListLive
    : isMobile
    ? searchStore.filterListMobile
    : searchStoreLive.filterList;
  const conditionalFilters = searchStore.filterListConditional;
  const mobileConditionalFilters = searchStore.filterListMobileConditional;
  const showSearchList = isMainSearch && searchQuery.length > 0;
  const filterSearchList = isLive
    ? searchStoreLive.filterSearchList
    : searchStore.filterSearchList;
  const fetchingFilterSearchList = isLive
    ? searchStoreLive.loadingFilterSearch
    : searchStore.loadingFilterSearch;

  const onFilterSearchClick = (filter: any) => {
    const _filter = { ...filtersMap[filter.type] };
    _filter.value = [filter.value];
    onFilterClick(_filter);
  };

  const filterJsonObj = isConditional
    ? isMobile
      ? mobileConditionalFilters
      : conditionalFilters
    : filters;
  const { matchingCategories, matchingFilters } = getMatchingEntries(
    searchQuery,
    filterJson(filterJsonObj, excludeFilterKeys, allowedFilterKeys, mode)
  );

  const isResultEmpty =
    (!filterSearchList || Object.keys(filterSearchList).length === 0) &&
    matchingCategories.length === 0 &&
    Object.keys(matchingFilters).length === 0;

  const displayedFilters =
    category === 'ALL'
      ? Object.entries(matchingFilters).flatMap(([category, filters]) =>
          filters.map((f: any) => ({ ...f, category }))
        )
      : matchingFilters[category];

  return (
    <div
      className={stl.wrapper}
      style={{ width: '560px', height: '380px', borderRadius: '.5rem' }}
    >
      <Input
        className={'mb-4'}
        placeholder={'Search'}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div className={'flex gap-2 items-start'}>
        <div className={'flex flex-col gap-1'} style={{ flex: 1 }}>
          {matchingCategories.map((key) => (
            <div
              key={key}
              onClick={() => setCategory(key)}
              className={cn('rounded px-4 py-2 hover:bg-active-blue capitalize cursor-pointer', key === category ? 'bg-active-blue' : '')}
            >
              {key.toLowerCase()}
            </div>
          ))}
        </div>
        <div
          className={'flex flex-col gap-1 overflow-y-auto w-full'}
          style={{ maxHeight: 300, flex: 2 }}
        >
          {displayedFilters.length
            ? displayedFilters.map((filter: Record<string, any>) => (
                <div
                  key={filter.label}
                  className={cn(
                    'flex items-center p-2 cursor-pointer gap-1 rounded-lg hover:bg-active-blue'
                  )}
                  onClick={() => onFilterClick({ ...filter })}
                >
                  {filter.category ? <div style={{ width: 150 }} className={'text-disabled-text w-full flex justify-between items-center'}>
                    <span>{filter.category}</span>
                    <ChevronRight size={14} />
                  </div> : null}
                  <div className={'flex items-center gap-2'}>
                    {getNewIcon(filter)}
                    <span>{filter.label}</span>
                  </div>
                </div>
              ))
            : null}
        </div>
      </div>
      {showSearchList && (
        <Loader loading={fetchingFilterSearchList}>
          <div className="-mx-6 px-6">
            {isResultEmpty && !fetchingFilterSearchList ? (
              <div className="flex items-center flex-col">
                <AnimatedSVG name={ICONS.NO_SEARCH_RESULTS} size={30} />
                <div className="font-medium px-3 mt-4">
                  {' '}
                  No matching filters.
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

export default observer(FilterModal);

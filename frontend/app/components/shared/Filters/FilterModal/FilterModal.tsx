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
  Info,
  SquareArrowOutUpRight,
} from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { Icon, Loader } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Input, Button } from 'antd';

import { FilterCategory, FilterKey, FilterType } from 'Types/filter/filterType';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import stl from './FilterModal.module.css';
import { useTranslation } from 'react-i18next';

export const IconMap = {
  [FilterKey.CLICK]: <Pointer size={14} />,
  [FilterKey.LOCATION]: <Navigation size={14} />,
  [FilterKey.INPUT]: <RectangleEllipsis size={14} />,
  [FilterKey.CUSTOM]: <Code size={14} />,
  [FilterKey.FETCH]: <ArrowUpDown size={14} />,
  [FilterKey.GRAPHQL]: <Network size={14} />,
  [FilterKey.STATEACTION]: <RectangleEllipsis size={14} />,
  [FilterKey.ERROR]: <OctagonAlert size={14} />,
  [FilterKey.ISSUE]: <CircleAlert size={14} />,
  [FilterKey.FETCH_FAILED]: <Code size={14} />,
  [FilterKey.DOM_COMPLETE]: <ArrowUpDown size={14} />,
  [FilterKey.LARGEST_CONTENTFUL_PAINT_TIME]: <Network size={14} />,
  [FilterKey.TTFB]: <Timer size={14} />,
  [FilterKey.AVG_CPU_LOAD]: <Cpu size={14} />,
  [FilterKey.AVG_MEMORY_USAGE]: <MemoryStick size={14} />,
  [FilterKey.USERID]: <SquareUser size={14} />,
  [FilterKey.USERANONYMOUSID]: <VenetianMask size={14} />,
  [FilterKey.USER_CITY]: <Pin size={14} />,
  [FilterKey.USER_STATE]: <MapPin size={14} />,
  [FilterKey.USER_COUNTRY]: <Earth size={14} />,
  [FilterKey.USER_DEVICE]: <Code size={14} />,
  [FilterKey.USER_OS]: <AppWindow size={14} />,
  [FilterKey.USER_BROWSER]: <Chrome size={14} />,
  [FilterKey.PLATFORM]: <MonitorSmartphone size={14} />,
  [FilterKey.REVID]: <FileStack size={14} />,
  [FilterKey.REFERRER]: <Workflow size={14} />,
  [FilterKey.DURATION]: <Clock2 size={14} />,
  [FilterKey.TAGGED_ELEMENT]: <SquareMousePointer size={14} />,
  [FilterKey.METADATA]: <ContactRound size={14} />,
  [FilterKey.UTM_SOURCE]: <CornerDownRight size={14} />,
  [FilterKey.UTM_MEDIUM]: <Layers size={14} />,
  [FilterKey.UTM_CAMPAIGN]: <Megaphone size={14} />,
  [FilterKey.FEATURE_FLAG]: <Flag size={14} />,
};

function filterJson(
  jsonObj: Record<string, any>,
  excludeKeys: string[] = [],
  excludeCategory: string[] = [],
  allowedFilterKeys: string[] = [],
  mode: 'filters' | 'events',
): Record<string, any> {
  return Object.fromEntries(
    Object.entries(jsonObj)
      .map(([key, value]) => {
        const arr = value.filter(
          (i: { key: string; isEvent: boolean; category: string }) => {
            if (excludeCategory.includes(i.category)) return false;
            if (excludeKeys.includes(i.key)) return false;
            if (mode === 'events' && !i.isEvent) return false;
            if (mode === 'filters' && i.isEvent) return false;
            return !(
              allowedFilterKeys.length > 0 && !allowedFilterKeys.includes(i.key)
            );
          },
        );
        return [key, arr];
      })
      .filter(([_, arr]) => arr.length > 0),
  );
}

export const getMatchingEntries = (
  searchQuery: string,
  filters: Record<string, any>,
) => {
  const matchingCategories: string[] = [];
  const matchingFilters: Record<string, any> = {};
  const lowerCaseQuery = searchQuery.toLowerCase();

  if (lowerCaseQuery.length === 0) {
    return {
      matchingCategories: ['All', ...Object.keys(filters)],
      matchingFilters: filters,
    };
  }

  Object.keys(filters).forEach((name) => {
    if (name.toLocaleLowerCase().includes(lowerCaseQuery)) {
      matchingCategories.push(name);
      matchingFilters[name] = filters[name];
    } else {
      const filtersQuery = filters[name].filter((filterOption: any) =>
        filterOption.label.toLocaleLowerCase().includes(lowerCaseQuery),
      );

      if (filtersQuery.length > 0) matchingFilters[name] = filtersQuery;
      filtersQuery.length > 0 && matchingCategories.push(name);
    }
  });

  return {
    matchingCategories: ['All', ...matchingCategories],
    matchingFilters,
  };
};

interface Props {
  isLive?: boolean;
  conditionalFilters: any;
  mobileConditionalFilters: any;
  onFilterClick?: (filter: any) => void;
  isMainSearch?: boolean;
  searchQuery?: string;
  excludeFilterKeys?: Array<string>;
  excludeCategory?: Array<string>;
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
  }
  return <Icon name={filter.icon} size={16} />;
};

function FilterModal(props: Props) {
  const { t } = useTranslation();
  const {
    isLive,
    onFilterClick = () => null,
    isMainSearch = false,
    excludeFilterKeys = [],
    excludeCategory = [],
    allowedFilterKeys = [],
    isConditional,
    mode,
  } = props;
  const [searchQuery, setSearchQuery] = React.useState('');
  const [category, setCategory] = React.useState('All');
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

  const parseAndAdd = (filter) => {
    if (
      filter.category === FilterCategory.EVENTS &&
      filter.key.startsWith('_')
    ) {
      filter.value = [filter.key.substring(1)];
      filter.key = FilterKey.CUSTOM;
      filter.label = 'Custom Events';
    }
    if (
      filter.type === FilterType.ISSUE &&
      filter.key.startsWith(`${FilterKey.ISSUE}_`)
    ) {
      filter.key = FilterKey.ISSUE;
    }
    onFilterClick(filter);
  };
  const onFilterSearchClick = (filter: any) => {
    const _filter = { ...filtersMap[filter.type] };
    _filter.value = [filter.value];
    parseAndAdd(_filter);
  };

  const filterJsonObj = isConditional
    ? isMobile
      ? mobileConditionalFilters
      : conditionalFilters
    : filters;
  const filterObj = filterJson(
    filterJsonObj,
    excludeFilterKeys,
    excludeCategory,
    allowedFilterKeys,
    mode,
  );
  const showMetaCTA =
    mode === 'filters' &&
    !filterObj.Metadata &&
    (allowedFilterKeys?.length
      ? allowedFilterKeys.includes(FilterKey.METADATA)
      : true) &&
    (excludeCategory?.length
      ? !excludeCategory.includes(FilterCategory.METADATA)
      : true) &&
    (excludeFilterKeys?.length
      ? !excludeFilterKeys.includes(FilterKey.METADATA)
      : true);

  const { matchingCategories, matchingFilters } = getMatchingEntries(
    searchQuery,
    filterObj,
  );

  const isResultEmpty =
    (!filterSearchList || Object.keys(filterSearchList).length === 0) &&
    matchingCategories.length === 0 &&
    Object.keys(matchingFilters).length === 0;

  const inputRef = useRef<any>(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [category]);

  const displayedFilters =
    category === 'All'
      ? Object.entries(matchingFilters).flatMap(([category, filters]) =>
          filters.map((f: any) => ({ ...f, category })),
        )
      : matchingFilters[category];

  return (
    <div className={stl.wrapper} style={{ width: '460px', maxHeight: '380px' }}>
      <Input
        ref={inputRef}
        className="mb-4 rounded-xl text-lg font-medium placeholder:text-lg placeholder:font-medium placeholder:text-neutral-300"
        placeholder="Search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2 items-start">
        <div className="flex flex-col gap-1">
          {matchingCategories.map((key) => (
            <div
              key={key}
              onClick={() => setCategory(key)}
              className={cn(
                'rounded-xl px-4 py-2 hover:bg-active-blue capitalize cursor-pointer font-medium',
                key === category ? 'bg-active-blue text-teal' : '',
              )}
            >
              {key}
            </div>
          ))}
          {showMetaCTA ? (
            <div
              key="META_CTA"
              onClick={() => setCategory('META_CTA')}
              className={cn(
                'rounded-xl px-4 py-2 hover:bg-active-blue capitalize cursor-pointer font-medium',
                category === 'META_CTA' ? 'bg-active-blue text-teal' : '',
              )}
            >
              {t('Metadata')}
            </div>
          ) : null}
        </div>
        <div
          className="flex flex-col gap-1 overflow-y-auto w-full h-full"
          style={{ maxHeight: 300, flex: 2 }}
        >
          {displayedFilters && displayedFilters.length
            ? displayedFilters.map((filter: Record<string, any>) => (
                <div
                  key={filter.label}
                  className={cn(
                    'flex items-center p-2 cursor-pointer gap-1 rounded-lg hover:bg-active-blue',
                  )}
                  onClick={() => parseAndAdd({ ...filter })}
                >
                  {filter.category ? (
                    <div
                      style={{ width: 100 }}
                      className="text-neutral-500/90		 w-full flex justify-between items-center"
                    >
                      <span>
                        {filter.subCategory
                          ? filter.subCategory
                          : filter.category}
                      </span>
                      <ChevronRight size={14} />
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500/90	 text-xs">
                      {getNewIcon(filter)}
                    </span>
                    <span>{filter.label}</span>
                  </div>
                </div>
              ))
            : null}
          {category === 'META_CTA' && showMetaCTA ? (
            <div
              style={{
                height: 300,
              }}
              className="mx-auto flex flex-col items-center justify-center gap-3 w-2/3 text-center"
            >
              <div className="font-semibold flex gap-2 items-center">
                <Info size={16} />
                <span>{t('No Metadata Available')}</span>
              </div>
              <div className="text-secondary">
                {t('Identify sessions & data easily by linking user-specific metadata.')}
              </div>
              <Button
                type="text"
                className="text-teal"
                onClick={() => {
                  const docs = 'https://docs.openreplay.com/en/en/session-replay/metadata/';
                  window.open(docs, '_blank');
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="">{t('Learn how')}</span>
                  <SquareArrowOutUpRight size={14} />
                </div>
              </Button>
            </div>
          ) : null}
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
                  {t('No matching filters.')}
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
                            'cursor-pointer px-3 py-1 flex items-center gap-2',
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

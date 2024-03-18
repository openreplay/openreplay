import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Input, Icon } from 'UI';
import FilterModal from 'Shared/Filters/FilterModal';
import { debounce } from 'App/utils';
import { assist as assistRoute, isRoute } from 'App/routes';
import { addFilterByKeyAndValue, fetchFilterSearch, edit } from 'Duck/search';
import {
  addFilterByKeyAndValue as liveAddFilterByKeyAndValue,
  fetchFilterSearch as liveFetchFilterSearch,
} from 'Duck/liveSearch';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Segmented } from 'antd';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';

const ASSIST_ROUTE = assistRoute();

interface Props {
  fetchFilterSearch: (query: any) => void;
  addFilterByKeyAndValue: (key: string, value: string) => void;
  liveAddFilterByKeyAndValue: (key: string, value: string) => void;
  liveFetchFilterSearch: any;
  edit: typeof edit;
}

function SessionSearchField(props: Props) {
  const isLive =
    isRoute(ASSIST_ROUTE, window.location.pathname) ||
    window.location.pathname.includes('multiview');
  const debounceFetchFilterSearch = React.useCallback(
    debounce(isLive ? props.liveFetchFilterSearch : props.fetchFilterSearch, 1000),
    []
  );

  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onSearchChange = ({ target: { value } }: any) => {
    setSearchQuery(value);
    debounceFetchFilterSearch({ q: value });
  };

  const onAddFilter = (filter: any) => {
    isLive
      ? props.liveAddFilterByKeyAndValue(filter.key, filter.value)
      : props.addFilterByKeyAndValue(filter.key, filter.value);
  };

  const onFocus = () => {
    setShowModal(true);
  };
  const onBlur = () => {
    setTimeout(() => {
      setShowModal(false);
    }, 200);
  };
  return (
    <div className="relative w-full">
      <Input
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={onSearchChange}
        placeholder={'Search sessions using any captured event (click, input, page, error...)'}
        id="search"
        type="search"
        autoComplete="off"
        className="text-lg placeholder-lg !border-0 w-full rounded-r-lg focus:!border-0 focus:ring-0"
      />

      {showModal && (
        <div className="absolute left-0 border shadow rounded bg-white z-50">
          <FilterModal
            searchQuery={searchQuery}
            isMainSearch={true}
            onFilterClick={onAddFilter}
            isLive={isLive}
          />
        </div>
      )}
    </div>
  );
}

const AiSearchField = observer(({ edit }: Props) => {
  const { aiFiltersStore } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const debounceAiFetch = React.useCallback(debounce(aiFiltersStore.getSearchFilters, 1000), []);

  const onSearchChange = ({ target: { value } }: any) => {
    setSearchQuery(value);
    if (value !== '' && value !== searchQuery) {
      debounceAiFetch(value);
    }
  };

  React.useEffect(() => {
    if (aiFiltersStore.filtersSetKey !== 0) {
      console.log('updating filters', aiFiltersStore.filters, aiFiltersStore.filtersSetKey);
      edit(aiFiltersStore.filters)
    }
  }, [aiFiltersStore.filters, aiFiltersStore.filtersSetKey])

  return (
    <div className={'w-full'}>
      <Input
        onChange={onSearchChange}
        placeholder={'E.g., "Sessions with login issues this week"'}
        id="search"
        type="search"
        value={searchQuery}
        autoComplete="off"
        className="text-lg placeholder-lg !border-0 rounded-r-lg focus:!border-0 focus:ring-0"
      />
    </div>
  );
})

function AiSessionSearchField(props: Props) {
  const [tab, setTab] = useState('search');
  const [isFocused, setIsFocused] = useState(false);

  const boxStyle = isFocused ? gradientBox : gradientBoxUnfocused;
  return (
    <OutsideClickDetectingDiv
      onClickOutside={() => setIsFocused(false)}
      className={'bg-white rounded-lg'}
    >
      <div style={boxStyle} onClick={() => setIsFocused(true)}>
        <Segmented
          value={tab}
          // className={'bg-figmaColors-divider'}
          onChange={(value) => setTab(value as string)}
          options={[
            {
              label: (
                <div className={'flex items-center gap-2'}>
                  <Icon name={'search'} size={16} />
                  <span>Search</span>
                </div>
              ),
              value: 'search',
            },
            {
              label: (
                <div className={'flex items-center gap-2'}>
                  <Icon name={'sparkles'} size={16} />
                  <span>Ask AI</span>
                </div>
              ),
              value: 'ask',
            },
          ]}
        />
        {tab === 'ask' ? <AiSearchField {...props} /> : <SessionSearchField {...props} />}
      </div>
    </OutsideClickDetectingDiv>
  );
}

const gradientBox = {
  border: 'double 1px transparent',
  borderRadius: '6px',
  background:
    'linear-gradient(#f6f6f6, #f6f6f6), linear-gradient(to right, #394EFF 0%, #3EAAAF 100%)',
  backgroundOrigin: 'border-box',
  backgroundClip: 'content-box, border-box',
  display: 'flex',
  gap: '0.25rem',
  alignItems: 'center',
  width: '100%',
};

const gradientBoxUnfocused = {
  borderRadius: '6px',
  border: 'double 1px transparent',
  background: '#f6f6f6',
  display: 'flex',
  gap: '0.25rem',
  alignItems: 'center',
  width: '100%',
};

export default connect(null, {
  addFilterByKeyAndValue,
  fetchFilterSearch,
  liveFetchFilterSearch,
  liveAddFilterByKeyAndValue,
  edit,
})(observer(AiSessionSearchField));

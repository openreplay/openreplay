import { CloseOutlined, EnterOutlined } from '@ant-design/icons';
import { Tour } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { connect } from 'react-redux';

import { useStore } from 'App/mstore';
import { assist as assistRoute, isRoute } from 'App/routes';
import { debounce } from 'App/utils';
import {
  addFilterByKeyAndValue as liveAddFilterByKeyAndValue,
  fetchFilterSearch as liveFetchFilterSearch,
} from 'Duck/liveSearch';
import {
  addFilterByKeyAndValue,
  clearSearch,
  edit,
  fetchFilterSearch,
} from 'Duck/search';
import { Icon, Input } from 'UI';

import FilterModal from 'Shared/Filters/FilterModal';

import OutsideClickDetectingDiv from '../OutsideClickDetectingDiv';

const ASSIST_ROUTE = assistRoute();

interface Props {
  fetchFilterSearch: (query: any) => void;
  addFilterByKeyAndValue: (key: string, value: string) => void;
  liveAddFilterByKeyAndValue: (key: string, value: string) => void;
  liveFetchFilterSearch: any;
  appliedFilter: any;
  edit: typeof edit;
  clearSearch: typeof clearSearch;
  setFocused?: (focused: boolean) => void;
}

function SessionSearchField(props: Props) {
  const isLive =
    isRoute(ASSIST_ROUTE, window.location.pathname) ||
    window.location.pathname.includes('multiview');
  const debounceFetchFilterSearch = React.useCallback(
    debounce(
      isLive ? props.liveFetchFilterSearch : props.fetchFilterSearch,
      1000
    ),
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
    props.setFocused?.(true);
  };
  const onBlur = () => {
    setTimeout(() => {
      setShowModal(false);
      props.setFocused?.(false);
    }, 200);
  };
  return (
    <div className="relative w-full">
      <Input
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={onSearchChange}
        placeholder={
          'Search sessions using any captured event (click, input, page, error...)'
        }
        style={{ minWidth: 360, height: 30 }}
        id="search"
        type="search"
        autoComplete="off"
        className="px-2 py-1 text-lg placeholder-lg !border-0 rounded-r-full nofocus"
      />

      {showModal && (
        <div className="absolute left-0  shadow-sm rounded-lg bg-white z-50">
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

const AiSearchField = observer(
  ({ edit, appliedFilter, clearSearch }: Props) => {
    const hasFilters =
      appliedFilter && appliedFilter.filters && appliedFilter.filters.size > 0;
    const { aiFiltersStore } = useStore();
    const [searchQuery, setSearchQuery] = useState('');

    const onSearchChange = ({ target: { value } }: any) => {
      setSearchQuery(value);
    };

    const fetchResults = () => {
      if (searchQuery) {
        void aiFiltersStore.getSearchFilters(searchQuery);
      }
    };

    const handleKeyDown = (event: any) => {
      if (event.key === 'Enter') {
        fetchResults();
      }
    };

    const clearAll = () => {
      clearSearch();
      setSearchQuery('');
    };

    React.useEffect(() => {
      if (aiFiltersStore.filtersSetKey !== 0) {
        edit(aiFiltersStore.filters);
      }
    }, [aiFiltersStore.filters, aiFiltersStore.filtersSetKey]);

    return (
      <div className={'w-full'}>
        <Input
          onChange={onSearchChange}
          placeholder={'E.g., "Sessions with login issues this week"'}
          id="search"
          onKeyDown={handleKeyDown}
          value={searchQuery}
          style={{ minWidth: 360, height: 30 }}
          autoComplete="off"
          className="px-2 py-1 pe-9 text-lg placeholder-lg !border-0 rounded-e-full nofocus"
          leadingButton={
            searchQuery !== '' ? (
              <div
                className={'h-full flex items-center cursor-pointer'}
                onClick={hasFilters ? clearAll : fetchResults}
              >
                <div className={'px-2 py-1 hover:bg-active-blue rounded mr-2'}>
                  {hasFilters ? <CloseOutlined /> : <EnterOutlined />}
                </div>
              </div>
            ) : null
          }
        />
      </div>
    );
  }
);

function AiSessionSearchField(props: Props) {
  const askTourKey = '__or__ask-tour';
  const tabKey = '__or__tab';
  const { aiFiltersStore } = useStore();
  const isTourShown = localStorage.getItem(askTourKey) !== null;
  const [tab, setTab] = useState(localStorage.getItem(tabKey) || 'search');
  const [touring, setTouring] = useState(!isTourShown);
  const [isFocused, setFocused] = React.useState(false);
  const askAiRef = React.useRef(null);

  const closeTour = () => {
    setTouring(false);
    localStorage.setItem(askTourKey, 'true');
  };
  const changeValue = (v?: string) => {
    const newTab = v ? v : tab !== 'ask' ? 'ask' : 'search';
    setTab(newTab);
    localStorage.setItem(tabKey, newTab);
  };

  const boxStyle = tab === 'ask'
                   ? gradientBox
                   : isFocused ? regularBoxFocused : regularBoxUnfocused;
  return (
    <div className={'bg-white rounded-full shadow-sm'}>
      <div
        className={aiFiltersStore.isLoading ? 'animate-bg-spin' : ''}
        style={boxStyle}
      >
        <div ref={askAiRef} className={'px-2'}>
          <AskAiSwitchToggle
            enabled={tab === 'ask'}
            setEnabled={changeValue}
            loading={aiFiltersStore.isLoading}
          />
        </div>
        {tab === 'ask' ? (
          <AiSearchField {...props} />
        ) : (
          <SessionSearchField {...props} setFocused={setFocused} />
        )}
        <Tour
          open={touring}
          onClose={closeTour}
          steps={[
            {
              title: (
                <div
                  className={'text-xl font-semibold flex items-center gap-2'}
                >
                  <span>Introducing</span>
                  <Icon name={'sparkles'} size={18} />
                  <span>Ask AI</span>
                </div>
              ),
              target: () => askAiRef.current,
              description:
                'Easily find sessions with our AI search. Just enable Ask AI, type in your query naturally, and the AI will swiftly and precisely display relevant sessions.',
              nextButtonProps: {
                children: (
                  <OutsideClickDetectingDiv
                    onClickOutside={closeTour}
                    className={
                      'w-full h-full text-white flex items-center gap-2'
                    }
                  >
                    <span>Ask AI</span>
                    <Icon
                      name={'arrow-right-short'}
                      size={16}
                      color={'white'}
                    />
                  </OutsideClickDetectingDiv>
                ),
                onClick: () => {
                  changeValue('ask');
                  closeTour();
                },
              },
            },
          ]}
        />
      </div>
    </div>
  );
}

export const AskAiSwitchToggle = ({
  enabled,
  setEnabled,
  loading,
}: {
  enabled: boolean;
  loading: boolean;
  setEnabled: () => void;
}) => {
  return (
    <div
      role="switch"
      aria-checked={enabled}
      onClick={() => setEnabled()}
      className={loading ? 'animate-bg-spin' : ''}
      style={{
        position: 'relative',
        display: 'inline-block',
        height: 24,
        background: enabled
          ? 'linear-gradient(-25deg, #394eff, #3EAAAf, #3ccf65)'
          : 'rgb(170 170 170)',
        backgroundSize: loading ? '200% 200%' : 'unset',
        borderRadius: 100,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        border: 0,
        verticalAlign: 'middle',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          insetInlineStart: enabled ? 'calc(100% - 21px)' : '3px',
          position: 'absolute',
          top: 3,
          width: 18,
          height: 18,
          transition: 'all 0.2s ease-in-out',
          background: '#fff',
          borderRadius: 100,
          verticalAlign: 'middle',
        }}
      />
      <div
        style={{
          display: 'inline-block',
          overflow: 'hidden',
          borderRadius: 100,
          height: '100%',
          transition: 'all 0.2s ease-in-out',
          paddingInline: !enabled ? '30px 0px' : '10px 24px',
          width: 88,
        }}
      >
        <div style={{ color: 'white', fontSize: 16 }}>Ask AI</div>
      </div>
    </div>
  );
};

export const gradientBox = {
  border: 'double 1.5px transparent',
  borderRadius: '100px',
  background:
    'linear-gradient(#ffffff, #ffffff), linear-gradient(-45deg, #394eff, #3eaaaf, #3ccf65)',
  backgroundOrigin: 'border-box',
  backgroundSize: '200% 200%',
  backgroundClip: 'content-box, border-box',
  display: 'flex',
  gap: '0.25rem',
  alignItems: 'center',
  width: '100%',
};

const regularBoxUnfocused = {
  borderRadius: '100px',
  border: 'solid 1.5px #BFBFBF',
  background: '#fffff',
  display: 'flex',
  gap: '0.25rem',
  alignItems: 'center',
  width: '100%',
};

const regularBoxFocused = {
  borderRadius: '100px',
  border: 'solid 1.5px #394EFF',
  background: '#fffff',
  display: 'flex',
  gap: '0.25rem',
  alignItems: 'center',
  width: '100%',
}

export default connect(
  (state: any) => ({
    appliedFilter: state.getIn(['search', 'instance']),
  }),
  {
    addFilterByKeyAndValue,
    fetchFilterSearch,
    liveFetchFilterSearch,
    liveAddFilterByKeyAndValue,
    edit,
    clearSearch,
  }
)(observer(AiSessionSearchField));

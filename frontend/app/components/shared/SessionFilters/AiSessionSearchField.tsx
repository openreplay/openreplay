import { CloseOutlined, EnterOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useStore } from 'App/mstore';
import { Input } from 'UI';

const AiSearchField = observer(() => {
  const { searchStore } = useStore();
  const appliedFilter = searchStore.instance;
  const hasFilters =
    appliedFilter && appliedFilter.filters && appliedFilter.filters.length > 0;
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
    searchStore.clearSearch();
    setSearchQuery('');
  };

  React.useEffect(() => {
    if (aiFiltersStore.filtersSetKey !== 0) {
      searchStore.edit(aiFiltersStore.filters);
    }
  }, [aiFiltersStore.filters, aiFiltersStore.filtersSetKey]);

  return (
    <div className="w-full">
      <Input
        onChange={onSearchChange}
        placeholder='E.g., "Sessions with login issues this week"'
        id="search"
        onKeyDown={handleKeyDown}
        value={searchQuery}
        style={{ minWidth: 360, height: 30 }}
        autoComplete="off"
        className="px-4 py-1 text-lg placeholder-lg !border-0 nofocus"
        leadingButton={
          searchQuery !== '' ? (
            <div
              className="h-full flex items-center cursor-pointer"
              onClick={hasFilters ? clearAll : fetchResults}
            >
              <div className="px-2 py-1 hover:bg-active-blue rounded mr-2">
                {hasFilters ? <CloseOutlined /> : <EnterOutlined />}
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
});

function AiSessionSearchField() {
  const { aiFiltersStore } = useStore();

  return (
    <div className="bg-white rounded-full shadow-sm w-full">
      <div
        className={aiFiltersStore.isLoading ? 'animate-bg-spin' : ''}
        style={gradientBox}
      >
        <AiSearchField />
      </div>
    </div>
  );
}

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
  overflow: 'hidden',
};

export default observer(AiSessionSearchField);

import { Button, Input, Segmented } from 'antd';
import { MoveUpRight } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { debounce } from "App/utils";
import { useStore } from 'App/mstore';
import { Icon } from 'UI';

const SpotsListHeader = observer(({
  onDelete,
  selectedCount,
  onClearSelection,
}: {
  onDelete: () => void;
  selectedCount: number;
  onClearSelection: () => void;
}) => {
  const { spotStore } = useStore();

  const debouncedFetch = React.useMemo(() => debounce(spotStore.fetchSpots, 250), []);
  const onSearch = (value: string) => {
    spotStore.setQuery(value);
    void spotStore.fetchSpots();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    spotStore.setQuery(e.target.value);
    debouncedFetch()
  };

  const onFilterChange = (key: 'all' | 'own') => {
    spotStore.setFilter(key);
    void spotStore.fetchSpots();
  };

  const handleSegmentChange = (value: string) => {
    const key = value === 'All Spots' ? 'all' : 'own';
    onFilterChange(key);
  };

  return (
    <div className={'flex items-center justify-between w-full'}>
      <div className="flex gap-4 items-center">
        <div className="flex gap-1 items-center">
          <Icon name={'orSpot'} size={24} />
          <h1 className={'text-2xl capitalize mr-2'}>Spot List</h1>
        </div>
        <Button
          type="default"
          size="small"
          className="flex items-center bg-teal/10 rounded-xl shadow-none border border-transparent hover:border"
        >
          <div className="w-50 pb-0.5">
            <img
              src={'assets/img/chrome.svg'}
              alt={'Get Spot by OpenReplay'}
              width={16}
            />
          </div>
          Get Extension <MoveUpRight size={16} strokeWidth={1.5} />
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <div className={'ml-auto'}>
          {selectedCount > 0 && (
            <>
              <Button
                type="text"
                onClick={onClearSelection}
                className="mr-2 px-3"
              >
                Clear
              </Button>
              <Button onClick={onDelete} type="primary" ghost>
                Delete ({selectedCount})
              </Button>
            </>
          )}
        </div>

        <Segmented
          options={['All Spots', 'My Spots']}
          value={spotStore.filter === 'all' ? 'All Spots' : 'My Spots'}
          onChange={handleSegmentChange}
          className="mr-4 lg:hidden xl:flex"
        />

        <div className="w-56">
          <Input.Search
            value={spotStore.query}
            allowClear
            name="spot-search"
            placeholder="Filter by title"
            onChange={handleInputChange}
            onSearch={onSearch}
            className="rounded-lg"
          />
        </div>
      </div>
    </div>
  );
})

export default SpotsListHeader;
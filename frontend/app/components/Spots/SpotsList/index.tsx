import { Button, Input, Segmented, message } from 'antd';
import { MoveUpRight } from 'lucide-react';
import { Pin, Puzzle, Share2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { numberWithCommas } from 'App/utils';
import { Icon, Loader, Pagination } from "UI";
import withPermissions from "../../hocs/withPermissions";

import SpotListItem from './SpotListItem';

function SpotsListHeader({
  onDelete,
  selectedCount,
  onClearSelection,
}: {
  onDelete: () => void;
  selectedCount: number;
  onClearSelection: () => void;
}) {
  const { spotStore } = useStore();

  // Handle search input and trigger spot fetching
  const onSearch = (value: string) => {
    spotStore.setQuery(value);
    void spotStore.fetchSpots();
  };

  // Handle input change and update the query in the store
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    spotStore.setQuery(e.target.value);
  };

  // Handle filter changes (All Spots / My Spots) and fetch spots accordingly
  const onFilterChange = (key: 'all' | 'own') => {
    spotStore.setFilter(key);
    void spotStore.fetchSpots();
  };

  // Update filter state based on selected segment
  const handleSegmentChange = (value: string) => {
    const key = value === 'All Spots' ? 'all' : 'own';
    onFilterChange(key);
  };

  return (
    <div className={'flex items-center justify-between w-full'}>
      <div className='flex gap-4 items-center'>
        <div className='flex gap-1 items-center'>
          <Icon name={'orSpot'} size={24} />
          <h1 className={'text-2xl capitalize mr-2'}>Spot List</h1>
        </div>
        <Button type='default' size='small' className='flex items-center bg-teal/10 rounded-xl shadow-none border border-transparent hover:border'>
          <div className='w-50 pb-0.5'>
            <img src={'assets/img/chrome.svg'} alt={'Get Spot by OpenReplay'} width={16} />
          </div>
          Get Extension <MoveUpRight size={16} strokeWidth={1.5} />
        </Button>
      </div>

      <div className='flex gap-2 items-center'>

        {/* Display Delete and Clear Selection buttons if items are selected */}
        <div className={'ml-auto'}>
          {selectedCount > 0 && (
            <>
              <Button type='text' onClick={onClearSelection} className='mr-2 px-3'>
                Clear
              </Button>
              <Button onClick={onDelete} type='primary' ghost>
                Delete ({selectedCount})
              </Button>
            </>
          )}
        </div>

        <Segmented
          options={['All Spots', 'My Spots']}
          value={spotStore.filter === 'all' ? 'All Spots' : 'My Spots'}
          onChange={handleSegmentChange}
          className='mr-4 lg:hidden xl:flex'
        />
       
        <div className='w-56'>
          <Input.Search
            value={spotStore.query}  // Controlled input value
            allowClear
            name="spot-search"
            placeholder="Filter by title"
            onChange={handleInputChange}  // Update query as user types
            onSearch={onSearch}  // Trigger search on enter or search button click
            className='rounded-lg'
          />
        </div>
      </div>
    </div>
  );
}

function SpotsList() {
  const [selectedSpots, setSelectedSpots] = React.useState<string[]>([]);
  const { spotStore } = useStore();

  // Fetch spots when component mounts or when store changes
  React.useEffect(() => {
    void spotStore.fetchSpots();
  }, [spotStore]);

  // Handle pagination changes
  const onPageChange = (page: number) => {
    spotStore.setPage(page);
    void spotStore.fetchSpots();
  };

  // Delete a single spot and update selection
  const onDelete = async (spotId: string) => {
    await spotStore.deleteSpot([spotId]);
    setSelectedSpots(selectedSpots.filter((s) => s !== spotId));
  };

  // Batch delete selected spots, manage pagination if page becomes empty
  const batchDelete = async () => {
    const deletedCount = selectedSpots.length;
    await spotStore.deleteSpot(selectedSpots);
    setSelectedSpots([]);

    // Adjust pagination if the current page becomes empty after deletion
    const remainingItemsOnPage = spotStore.spots.length - deletedCount;
    if (remainingItemsOnPage <= 0 && spotStore.page > 1) {
        spotStore.setPage(spotStore.page - 1);
        await spotStore.fetchSpots();
    } else {
        await spotStore.fetchSpots();
    }

    // Display success message with correct pluralization
    message.success(`${deletedCount} Spot${deletedCount > 1 ? 's' : ''} deleted successfully.`);
  };

  // Rename a spot
  const onRename = (id: string, newName: string) => {
    return spotStore.updateSpot(id, { name: newName });
  };

  // Fetch video associated with a spot
  const onVideo = (id: string) => {
    return spotStore.getVideo(id);
  };

  // Handle selection of spots for deletion
  const handleSelectSpot = (spotId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedSpots((prev) => [...prev, spotId]);
    } else {
      setSelectedSpots((prev) => prev.filter((id) => id !== spotId));
    }
  };

  // Check if a spot is selected
  const isSpotSelected = (spotId: string) => selectedSpots.includes(spotId);

  // Clear all selections
  const clearSelection = () => {
    setSelectedSpots([]);
  };

  return (
    <div className={'w-full relative'}>
      <div className={'flex mx-auto p-2 px-4 bg-white rounded-lg shadow-sm mb-2 w-full z-50'}>
        <SpotsListHeader
          onDelete={batchDelete}
          selectedCount={selectedSpots.length}
          onClearSelection={clearSelection}
        />
      </div>

      <div className={'mx-auto pb-4'} style={{ maxWidth: 1360 }}>
        {spotStore.total === 0 ? (
          // Show loader or empty state if no spots are available
          spotStore.isLoading ? <Loader /> : <EmptyPage />
        ) : (
          <>
            {/* Display list of spots with selection, delete, and pagination */}
            <div className={'py-2 border-gray-lighter grid grid-cols-3 gap-6'}>
              {spotStore.spots.map((spot) => (
                <SpotListItem
                  key={spot.spotId}
                  spot={spot}
                  onDelete={() => onDelete(spot.spotId)}
                  onRename={onRename}
                  onVideo={onVideo}
                  onSelect={(checked: boolean) => handleSelectSpot(spot.spotId, checked)}
                  isSelected={isSpotSelected(spot.spotId)}
                />
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 shadow-sm w-full bg-white rounded-lg mt-2">
              <div>
                Showing{' '}
                <span className="font-medium">
                  {(spotStore.page - 1) * spotStore.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {(spotStore.page - 1) * spotStore.limit + spotStore.spots.length}
                </span>{' '}
                of{' '}
                <span className="font-medium">
                  {numberWithCommas(spotStore.total)}
                </span>{' '}
                spots.
              </div>
              <Pagination
                page={spotStore.page}
                total={spotStore.total}
                onPageChange={onPageChange}
                limit={spotStore.limit}
                debounceRequest={500}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyPage() {
  return (
    <div className={'flex flex-col gap-4 items-center w-full border-t pt-2'}>
      <div className={'font-semibold text-xl'}>Spot your first bug</div>
      <div className={'text-disabled-text w-1/2'}>
        Spot is a browser extension by OpenReplay, that captures detailed bug
        reports including screen recordings and technical details that
        developers need to troubleshoot an issue efficiently.
      </div>

      <div className={'flex gap-4 mt-4'}>
        <img src={'assets/img/spot1.jpg'} alt={'pin spot'} width={200} />
        <div className={'flex flex-col gap-2'}>
          <div className={'flex items-center gap-2'}>
            <div
              className={
                '-ml-2 h-8 w-8 bg-[#FFF7E6] rounded-full flex items-center justify-center'
              }
            >
              <span>1</span>
            </div>
            <div className={'font-semibold'}>Pin Spot extension (Optional)</div>
          </div>

          <div className={'flex items-center gap-2'}>
            <Puzzle size={16} strokeWidth={1} />
            <div>Open installed extensions</div>
          </div>
          <div className={'flex items-center gap-2'}>
            <Pin size={16} strokeWidth={1} />
            <div>Pin Spot, for easy access.</div>
          </div>
        </div>
      </div>
      <div className={'flex gap-4 mt-4'}>
        <img src={'assets/img/spot2.jpg'} alt={'start recording'} width={200} />
        <div className={'flex flex-col gap-2'}>
          <div className={'flex items-center gap-2'}>
            <div
              className={
                '-ml-2 h-8 w-8 bg-[#FFF7E6] rounded-full flex items-center justify-center'
              }
            >
              <span>2</span>
            </div>
            <div className={'font-semibold'}>Capture and share a bug</div>
          </div>
          <div className={'flex items-center gap-2'}>
            <Icon name={'orSpot'} size={16} />
            <div>Click the Spot icon to log bugs!</div>
          </div>
          <div className={'flex items-center gap-2'}>
            <Share2 size={16} strokeWidth={1} />
            <div>Share it with your team</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withPermissions(['SPOT'])(observer(SpotsList));

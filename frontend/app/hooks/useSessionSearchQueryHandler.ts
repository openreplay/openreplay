import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { JsonUrlConverter } from 'App/utils/search';
import { useStore } from '@/mstore';
import Search from '@/mstore/types/search';
import { getFilterFromJson } from 'Types/filter/newFilter';

interface Props {
  onBeforeLoad?: () => Promise<void>;
  appliedFilter: Record<string, any>;
  loading: boolean;
  onLoaded?: () => void;
}

const useSessionSearchQueryHandler = ({
  onBeforeLoad,
  appliedFilter,
  loading,
  onLoaded = () => null,
}: Props) => {
  const { searchStore } = useStore();
  const [beforeHookLoaded, setBeforeHookLoaded] = useState(!onBeforeLoad);
  const history = useHistory();

  // Apply filter from the query string when the component mounts
  useEffect(() => {
    const applyFilterFromQuery = async () => {
      if (!loading && !searchStore.urlParsed) {
        try {
          if (onBeforeLoad) {
            await onBeforeLoad();
            setBeforeHookLoaded(true);
          }

          const converter = JsonUrlConverter.urlParamsToJson(
            history.location.search,
          );
          const json = getFilterFromJson(converter.toJSON());
          const filter = new Search(json);

          // // Even if there are no filters, mark URL as parsed
          // if (filter.filters.length === 0) {
          //   searchStore.setUrlParsed();
          //   return;
          // }

          // Apply filter first
          if (filter.filters.length > 0) {
            searchStore.applyFilter(filter, true);
          }

          searchStore.setUrlParsed();
          onLoaded?.();
        } catch (error) {
          console.error('Error applying filter from query:', error);
          searchStore.setUrlParsed();
        }
      }
    };

    void applyFilterFromQuery();
  }, [loading, searchStore, history.location.search, onBeforeLoad]);

  // Update the URL whenever the appliedFilter changes
  useEffect(() => {
    const updateUrlWithFilter = () => {
      if (!loading && beforeHookLoaded) {
        const query = JsonUrlConverter.jsonToUrlParams(appliedFilter);
        history.replace({ search: query });
      }
    };

    updateUrlWithFilter();
  }, [appliedFilter, loading, beforeHookLoaded, history]);

  // Ensure the URL syncs on remount if already parsed
  useEffect(() => {
    if (searchStore.urlParsed) {
      const query = JsonUrlConverter.jsonToUrlParams(appliedFilter);
      history.replace({ search: query });
    }
  }, [appliedFilter, searchStore.urlParsed, history]);

  return null;
};

export default useSessionSearchQueryHandler;

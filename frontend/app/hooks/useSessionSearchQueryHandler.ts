import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { createUrlQuery, getFiltersFromQuery } from 'App/utils/search';
import { useStore } from '@/mstore';

interface Props {
  onBeforeLoad?: () => Promise<any>;
  appliedFilter: any;
  loading: boolean;
}

const useSessionSearchQueryHandler = (props: Props) => {
  const { searchStore } = useStore();
  const [beforeHookLoaded, setBeforeHookLoaded] = useState(!props.onBeforeLoad);
  const { appliedFilter, loading } = props;
  const history = useHistory();

  useEffect(() => {
    const applyFilterFromQuery = async () => {
      if (!loading) {
        if (props.onBeforeLoad) {
          await props.onBeforeLoad();
          setBeforeHookLoaded(true);
        }

        const filter = getFiltersFromQuery(history.location.search, appliedFilter);
        searchStore.applyFilter(filter, true);
      }
    };

    void applyFilterFromQuery();
  }, [loading]);

  useEffect(() => {
    const generateUrlQuery = () => {
      if (!loading && beforeHookLoaded) {
        const search: any = createUrlQuery(appliedFilter);
        history.replace({ search });
      }
    };

    generateUrlQuery();
  }, [appliedFilter, loading, beforeHookLoaded]);

  return null;
};

export default useSessionSearchQueryHandler;

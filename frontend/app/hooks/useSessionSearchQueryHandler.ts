import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { createUrlQuery, getFiltersFromQuery } from 'App/utils/search';

interface Props {
  onBeforeLoad?: () => Promise<any>;
  appliedFilter: any;
  applyFilter: any;
  loading: boolean;
}

const useSessionSearchQueryHandler = (props: Props) => {
  const [beforeHookLoaded, setBeforeHookLoaded] = useState(!props.onBeforeLoad);
  const { appliedFilter, applyFilter, loading } = props;
  const history = useHistory();

  useEffect(() => {
    const applyFilterFromQuery = async () => {
      if (!loading) {
        if (props.onBeforeLoad) {
          await props.onBeforeLoad();
          setBeforeHookLoaded(true);
        }
        const filter = getFiltersFromQuery(history.location.search, appliedFilter);
        applyFilter(filter, true, false);
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

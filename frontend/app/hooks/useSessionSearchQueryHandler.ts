import { useEffect } from 'react';
import { useHistory } from 'react-router';
import { createUrlQuery, getFiltersFromQuery } from 'App/utils/search';

interface Props {
  onBeforeLoad?: () => Promise<any>;
  appliedFilter: any;
  applyFilter: any;
  loading: boolean;
  tagsLoading: boolean;
}

const useSessionSearchQueryHandler = (props: Props) => {
  const { appliedFilter, applyFilter, loading, tagsLoading } = props;
  const history = useHistory();

  useEffect(() => {
    const applyFilterFromQuery = async () => {
      if (!loading) {
        if (props.onBeforeLoad) {
          await props.onBeforeLoad();
        }
        const filter = getFiltersFromQuery(history.location.search, appliedFilter);
        applyFilter(filter, true, false);
      }
    };

    applyFilterFromQuery();
  }, [loading]);

  useEffect(() => {
    const generateUrlQuery = () => {
      if (!loading && !tagsLoading) {
        const search: any = createUrlQuery(appliedFilter);
        history.replace({ search });
      }
    };

    generateUrlQuery();
  }, [appliedFilter, loading, tagsLoading]);

  return null;
};

export default useSessionSearchQueryHandler;

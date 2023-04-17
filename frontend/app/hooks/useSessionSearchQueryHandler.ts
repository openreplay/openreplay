import { useEffect } from 'react';
import { useHistory } from 'react-router';
import { createUrlQuery, getFiltersFromQuery } from 'App/utils/search';

interface Props {
  appliedFilter: any;
  applyFilter: any;
  loading: boolean;
}

const useSessionSearchQueryHandler = (props: Props) => {
  const { appliedFilter, applyFilter, loading } = props;
  const history = useHistory();

  useEffect(() => {
    const applyFilterFromQuery = () => {
      if (!loading) {
        const filter = getFiltersFromQuery(history.location.search, appliedFilter);
        applyFilter(filter, true, false);
      }
    };

    applyFilterFromQuery();
  }, [loading]);

  useEffect(() => {
    const generateUrlQuery = () => {
      if (!loading) {
        const search: any = createUrlQuery(appliedFilter);
        history.replace({ search });
      }
    };

    generateUrlQuery();
  }, [appliedFilter, loading]);

  return null;
};

export default useSessionSearchQueryHandler;

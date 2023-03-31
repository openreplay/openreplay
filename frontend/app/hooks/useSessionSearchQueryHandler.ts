import { useEffect } from 'react';
import { useHistory } from 'react-router';
import { createUrlQuery, getFiltersFromQuery } from 'App/utils/search';

interface Props {
  appliedFilter: any;
  applyFilter: any;
}

const useSessionSearchQueryHandler = (props: Props) => {
  const { appliedFilter, applyFilter } = props;
  const history = useHistory();

  useEffect(() => {
    const applyFilterFromQuery = () => {
      const filter = getFiltersFromQuery(history.location.search, appliedFilter);
      applyFilter(filter, true, false);
    };

    applyFilterFromQuery();
  }, []);

  useEffect(() => {
    const generateUrlQuery = () => {
      const search: any = createUrlQuery(appliedFilter);
      history.replace({ search });
    };

    generateUrlQuery();
  }, [appliedFilter]);

  return null;
};

export default useSessionSearchQueryHandler;

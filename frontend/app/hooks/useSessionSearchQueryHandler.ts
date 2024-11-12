import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { JsonUrlConverter } from 'App/utils/search';
import { useStore } from '@/mstore';
import Search from '@/mstore/types/search';
import { getFilterFromJson } from 'Types/filter/newFilter';

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

        const converter = JsonUrlConverter.urlParamsToJson(history.location.search);
        const json: any = getFilterFromJson(converter.toJSON());
        const filter = new Search(json);
        searchStore.applyFilter(filter, true);
      }
    };

    void applyFilterFromQuery();
  }, [loading]);

  useEffect(() => {
    const generateUrlQuery = () => {
      if (!loading && beforeHookLoaded) {
        const converter = JsonUrlConverter.jsonToUrlParams(appliedFilter);
        history.replace({ search: converter });
      }
    };

    generateUrlQuery();
  }, [appliedFilter, loading, beforeHookLoaded]);

  return null;
};

export default useSessionSearchQueryHandler;

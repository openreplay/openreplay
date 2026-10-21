import { menuHidden } from '@/utils/split-utils';
import { useQuery } from '@tanstack/react-query';

import { useStore } from 'App/mstore';

import { type DistinctProperty, fetchList } from './api';

const EMPTY = { properties: [] as DistinctProperty[], total: 0 };

/** Display names of the project's properties, by raw name. */
function usePropertyNames(source: 'events' | 'users') {
  const { projectsStore } = useStore();
  const { data = EMPTY, isPending } = useQuery({
    queryKey: ['props-list', projectsStore.activeSiteId, source],
    queryFn: () => fetchList(source),
    enabled: !menuHidden.lexicon,
    staleTime: 20 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const getDisplayNameStr = (propName: string) =>
    data.properties.find((p) => p.name === propName)?.displayName || propName;

  return { getDisplayNameStr, isPending };
}

export default usePropertyNames;

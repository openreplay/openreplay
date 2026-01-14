import { fetchList } from './api';
import { useQuery } from '@tanstack/react-query';

/**
 * hook that will get all properties and then return a method to grab displayname by property name
 */
function usePropertyNames(source: 'events' | 'users') {
  const { data = { properties: [] }, isPending } = useQuery({
    queryKey: ['props-list', source],
    queryFn: () => fetchList(source),
  });

  const getDisplayName = (propName: string) => {
    const prop = data.properties.find((p) => p.name === propName);
    return prop ? prop.displayName : propName;
  };

  return { getDisplayName, isPending };
}

export default usePropertyNames;

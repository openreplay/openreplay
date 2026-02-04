import { menuHidden } from '@/utils/split-utils';
import { useQuery } from '@tanstack/react-query';
import { Loader } from 'lucide-react';
import React from 'react';

import { TextEllipsis } from 'UI';

import { fetchList } from './api';

/**
 * hook that will get all properties and then return a method to grab displayname by property name
 */
function usePropertyNames(source: 'events' | 'users') {
  const { data = { properties: [] }, isPending } = useQuery({
    queryKey: ['props-list', source],
    queryFn: () => fetchList(source),
    enabled: !menuHidden.lexicon,
    // refetch every 20 minutes
    staleTime: 20 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const getDisplayNameStr = (propName: string) => {
    const prop = data.properties.find((p) => p.name === propName);
    const hasDisplayName =
      prop && prop.displayName && prop.displayName.length > 0;
    return hasDisplayName ? prop.displayName : propName;
  };

  const getDisplayName = (propName: string, options?: Record<string, any>) => {
    if (menuHidden.lexicon)
      return <TextEllipsis {...options} text={propName} />;
    if (isPending)
      return (
        <div className="flex items-center gap-1">
          <Loader className="animate-spin" size={12} />
          <TextEllipsis {...options} text={propName} />
        </div>
      );
    const prop = data.properties.find((p) => p.name === propName);
    const hasDisplayName =
      prop && prop.displayName && prop.displayName.length > 0;
    return (
      <TextEllipsis
        {...options}
        text={hasDisplayName ? prop.displayName : propName}
      />
    );
  };

  return { getDisplayName, getDisplayNameStr, isPending };
}

export default usePropertyNames;

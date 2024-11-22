import React from 'react';
import SessionFilters from 'Shared/SessionFilters';
import AiSessionSearchField from 'Shared/SessionFilters/AiSessionSearchField';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

const MainSearchBar = () => {
  const { searchStore, projectsStore } = useStore();
  const projectId = projectsStore.siteId;
  const currSite = React.useRef(projectId);

  // @ts-ignore
  const originStr = window.env.ORIGIN || window.location.origin;
  const isSaas = /app\.openreplay\.com/.test(originStr);

  React.useEffect(() => {
    if (projectId !== currSite.current && currSite.current !== undefined) {
      console.debug('clearing filters due to project change');
      searchStore.clearSearch();
      currSite.current = projectId;
    }
  }, [projectId]);
  return (
    <div className={'flex flex-col gap-2 w-full'}>
      {isSaas ? <AiSessionSearchField /> : null}
      <SessionFilters />
    </div>
  );
};

export default observer(MainSearchBar);

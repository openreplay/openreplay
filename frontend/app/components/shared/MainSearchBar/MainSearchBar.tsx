import React from 'react';
import SessionFilters from 'Shared/SessionFilters';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function MainSearchBar() {
  const { searchStore, projectsStore } = useStore();
  const projectId = projectsStore.siteId;
  const currSite = React.useRef(projectId);

  React.useEffect(() => {
    if (projectId !== currSite.current && currSite.current !== undefined) {
      console.debug('clearing filters due to project change');
      searchStore.clearSearch();
      currSite.current = projectId;
    }
  }, [projectId]);
  return (
    <div className="flex flex-col gap-2 w-full">
      <SessionFilters />
    </div>
  );
}

export default observer(MainSearchBar);

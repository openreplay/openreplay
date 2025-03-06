import React from 'react';
import { observer } from 'mobx-react-lite';
import { TextEllipsis, Input } from 'UI';
import { PlayerContext } from 'App/components/Session/playerContext';
import useInputState from 'App/hooks/useInputState';

import { useModal } from 'App/components/Modal';
import TimeTable from '../TimeTable';
import BottomBlock from '../BottomBlock';
import ProfilerModal from '../ProfilerModal';
import { useRegExListFilterMemo } from '../useListFilter';
import { useTranslation } from 'react-i18next';

const renderDuration = (p: any) => `${p.duration}ms`;
const renderName = (p: any) => <TextEllipsis text={p.name} />;

function ProfilerPanel({ panelHeight }: { panelHeight: number }) {
  const { t } = useTranslation();
  const { store } = React.useContext(PlayerContext);
  const { tabStates, currentTab } = store.get();
  const profiles = tabStates[currentTab].profilesList || ([] as any[]); // TODO lest internal types

  const { showModal } = useModal();
  const [filter, onFilterChange] = useInputState();
  const filtered = useRegExListFilterMemo(profiles, (pr) => pr.name, filter);

  const onRowClick = (profile: any) => {
    showModal(<ProfilerModal profile={profile} />, { right: true, width: 500 });
  };
  return (
    <BottomBlock style={{ height: '100%' }}>
      <BottomBlock.Header>
        <div className="flex items-center">
          <span className="font-semibold color-gray-medium mr-4">
            {t('Profiler')}
          </span>
        </div>
        <Input
          // className="input-small"
          placeholder={t('Filter by name')}
          icon="search"
          name="filter"
          onChange={onFilterChange}
          height={28}
        />
      </BottomBlock.Header>
      <BottomBlock.Content>
        <TimeTable
          tableHeight={panelHeight - 40}
          rows={filtered}
          onRowClick={onRowClick}
          hoverable
        >
          {[
            {
              label: t('Name'),
              dataKey: 'name',
              width: 200,
              render: renderName,
            },
            {
              label: t('Time'),
              key: 'duration',
              width: 80,
              render: renderDuration,
            },
          ]}
        </TimeTable>
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export default observer(ProfilerPanel);

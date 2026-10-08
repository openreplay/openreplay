import { Truncated } from '@/ui/data/truncated';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { PlayerContext } from 'App/components/Session/playerContext';
import useInputState from 'App/hooks/useInputState';

import BottomBlock from '../BottomBlock';
import { Keyword } from '../PanelKit';
import ProfilerModal from '../ProfilerModal';
import TimeTable from '../TimeTable';
import { useRegExListFilterMemo } from '../useListFilter';

const renderDuration = (p: any) => `${p.duration}ms`;
const renderName = (p: any) => <Truncated text={p.name} />;

function ProfilerPanel({ panelHeight }: { panelHeight: number }) {
  const { t } = useTranslation();
  const { store } = React.useContext(PlayerContext);
  const { tabStates, currentTab } = store.get();
  const profiles = tabStates[currentTab].profilesList || ([] as any[]); // TODO lest internal types

  const { showModal } = useModal();
  const [filter, onFilterChange] = useInputState();
  const filtered = useRegExListFilterMemo(profiles, (pr) => pr.name, filter);

  const onRowClick = (profile: any) => {
    showModal(<ProfilerModal profile={profile} />, { right: true });
  };
  return (
    <BottomBlock style={{ height: '100%' }}>
      <BottomBlock.Header>
        <span />
        <div className="m-dt__bar-right">
          <Keyword
            value={filter}
            onChange={(value) => onFilterChange({ target: { value } } as any)}
            placeholder={t('Filter by name')}
          />
        </div>
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

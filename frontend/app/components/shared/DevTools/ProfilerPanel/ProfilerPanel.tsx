import React, { useState } from 'react';
import { connectPlayer } from 'Player';
import { TextEllipsis, Input } from 'UI';
import { getRE } from 'App/utils';

// import ProfileInfo from './ProfileInfo';
import TimeTable from '../TimeTable';
import BottomBlock from '../BottomBlock';
import { useModal } from 'App/components/Modal';
import ProfilerModal from '../ProfilerModal';

const renderDuration = (p: any) => `${p.duration}ms`;
const renderName = (p: any) => <TextEllipsis text={p.name} />;

interface Props {
  profiles: any;
}
function ProfilerPanel(props: Props) {
  const { profiles } = props;
  const { showModal } = useModal();
  const [filter, setFilter] = useState('');
  const filtered: any = React.useMemo(() => {
    const filterRE = getRE(filter, 'i');
    let list = profiles;

    list = list.filter(({ name }: any) => (!!filter ? filterRE.test(name) : true));
    return list;
  }, [filter]);

  const onFilterChange = ({ target: { value } }: any) => setFilter(value);
  const onRowClick = (profile: any) => {
    showModal(<ProfilerModal profile={profile} />, { right: true });
  };
  return (
    <BottomBlock>
      <BottomBlock.Header>
        <div className="flex items-center">
          <span className="font-semibold color-gray-medium mr-4">Profiler</span>
        </div>
        <Input
          // className="input-small"
          placeholder="Filter by name"
          icon="search"
          name="filter"
          onChange={onFilterChange}
          height={28}
        />
      </BottomBlock.Header>
      <BottomBlock.Content>
        <TimeTable rows={filtered} onRowClick={onRowClick} hoverable>
          {[
            {
              label: 'Name',
              dataKey: 'name',
              width: 200,
              render: renderName,
            },
            {
              label: 'Time',
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

export default connectPlayer((state: any) => {
  return {
    profiles: state.profilesList,
  };
})(ProfilerPanel);

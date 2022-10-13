import React, { useState } from 'react';
import { connectPlayer, jump } from 'Player';
import Log from 'Types/session/log';
import BottomBlock from '../BottomBlock';
import { LEVEL } from 'Types/session/log';
import { Tabs, Input, Icon, NoContent } from 'UI';
// import Autoscroll from 'App/components/Session_/Autoscroll';
import cn from 'classnames';
import ConsoleRow from '../ConsoleRow';
import { getRE } from 'App/utils';

const ALL = 'ALL';
const INFO = 'INFO';
const WARNINGS = 'WARNINGS';
const ERRORS = 'ERRORS';

const LEVEL_TAB = {
  [LEVEL.INFO]: INFO,
  [LEVEL.LOG]: INFO,
  [LEVEL.WARNING]: WARNINGS,
  [LEVEL.ERROR]: ERRORS,
  [LEVEL.EXCEPTION]: ERRORS,
};

const TABS = [ALL, ERRORS, WARNINGS, INFO].map((tab) => ({ text: tab, key: tab }));

function renderWithNL(s = '') {
  if (typeof s !== 'string') return '';
  return s.split('\n').map((line, i) => <div className={cn({ 'ml-20': i !== 0 })}>{line}</div>);
}

const getIconProps = (level: any) => {
  switch (level) {
    case LEVEL.INFO:
    case LEVEL.LOG:
      return {
        name: 'console/info',
        color: 'blue2',
      };
    case LEVEL.WARN:
    case LEVEL.WARNING:
      return {
        name: 'console/warning',
        color: 'red2',
      };
    case LEVEL.ERROR:
      return {
        name: 'console/error',
        color: 'red',
      };
  }
  return null;
};

interface Props {
  logs: any;
  exceptions: any;
}
function ConsolePanel(props: Props) {
  const { logs } = props;
  const additionalHeight = 0;
  const [activeTab, setActiveTab] = useState(ALL);
  const [filter, setFilter] = useState('');

  let filtered = React.useMemo(() => {
    const filterRE = getRE(filter, 'i');
    let list = logs;

    list = list.filter(
      ({ value, level }: any) =>
        (!!filter ? filterRE.test(value) : true) &&
        (activeTab === ALL || activeTab === LEVEL_TAB[level])
    );
    return list;
  }, [filter, activeTab]);

  const onTabClick = (activeTab: any) => setActiveTab(activeTab);
  const onFilterChange = ({ target: { value } }: any) => setFilter(value);

  return (
    <BottomBlock style={{ height: 300 + additionalHeight + 'px' }}>
      <BottomBlock.Header>
        <div className="flex items-center">
          <span className="font-semibold color-gray-medium mr-4">Console</span>
          <Tabs tabs={TABS} active={activeTab} onClick={onTabClick} border={false} />
        </div>
        <Input
          className="input-small h-8"
          placeholder="Filter by keyword"
          icon="search"
          iconPosition="left"
          name="filter"
          height={28}
          onChange={onFilterChange}
        />
      </BottomBlock.Header>
      <BottomBlock.Content className="overflow-y-auto">
        <NoContent
          title={
            <div className="capitalize flex items-center mt-16">
              <Icon name="info-circle" className="mr-2" size="18" />
              No Data
            </div>
          }
          size="small"
          show={filtered.length === 0}
        >
          {/* <Autoscroll> */}
          {filtered.map((l: any, index: any) => (
            <ConsoleRow
              key={index}
              log={l}
              jump={jump}
              iconProps={getIconProps(l.level)}
              renderWithNL={renderWithNL}
            />
          ))}
          {/* </Autoscroll> */}
        </NoContent>
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export default connectPlayer((state: any) => {
  const logs = state.logList;
  const exceptions = state.exceptionsList; // TODO merge
  const logExceptions = exceptions.map(({ time, errorId, name, projectId }: any) =>
    Log({
      level: LEVEL.ERROR,
      value: name,
      time,
      errorId,
    })
  );
  return {
    logs: logs.concat(logExceptions),
  };
})(ConsolePanel);

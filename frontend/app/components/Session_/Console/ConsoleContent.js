import React from 'react';
import cn from 'classnames';
import { getRE } from 'App/utils';
import { Icon, NoContent, Tabs, Input } from 'UI';
import { jump } from 'Player';
import { LEVEL } from 'Types/session/log';
import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock';
import stl from './console.module.css';
import ConsoleRow from './ConsoleRow';
// import { Duration } from 'luxon';

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

// eslint-disable-next-line complexity
const getIconProps = (level) => {
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

function renderWithNL(s = '') {
  if (typeof s !== 'string') return '';
  return s.split('\n').map((line, i) => <div className={cn({ 'ml-20': i !== 0 })}>{line}</div>);
}

export default class ConsoleContent extends React.PureComponent {
  state = {
    filter: '',
    activeTab: ALL,
  };
  onTabClick = (activeTab) => this.setState({ activeTab });
  onFilterChange = ({ target: { value } }) => this.setState({ filter: value });

  render() {
    const { logs, isResult, additionalHeight, logsNow } = this.props;
    const time = logsNow.length > 0 ? logsNow[logsNow.length - 1].time : undefined;
    const { filter, activeTab, currentError } = this.state;
    const filterRE = getRE(filter, 'i');
    const filtered = logs.filter(({ level, value }) =>
      activeTab === ALL
        ? filterRE.test(value)
        : filterRE.test(value) && LEVEL_TAB[level] === activeTab
    );

    const lastIndex = filtered.filter((item) => item.time <= time).length - 1;

    return (
      <>
        <BottomBlock style={{ height: 300 + additionalHeight + 'px' }}>
          <BottomBlock.Header showClose={!isResult}>
            <div className="flex items-center">
              <span className="font-semibold color-gray-medium mr-4">Console</span>
              <Tabs tabs={TABS} active={activeTab} onClick={this.onTabClick} border={false} />
            </div>
            <Input
              className="input-small h-8"
              placeholder="Filter by keyword"
              icon="search"
              iconPosition="left"
              name="filter"
              height={28}
              onChange={this.onFilterChange}
            />
          </BottomBlock.Header>
          <BottomBlock.Content>
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
              <Autoscroll autoScrollTo={Math.max(lastIndex, 0)}>
                {filtered.map((l) => (
                  <ConsoleRow
                    log={l}
                    jump={jump}
                    iconProps={getIconProps(l.level)}
                    renderWithNL={renderWithNL}
                  />
                ))}
              </Autoscroll>
            </NoContent>
          </BottomBlock.Content>
        </BottomBlock>
      </>
    );
  }
}

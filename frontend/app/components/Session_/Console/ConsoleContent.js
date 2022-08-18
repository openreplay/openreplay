import React from 'react';
import cn from 'classnames';
import { getRE } from 'App/utils';
import { Icon, NoContent, Tabs, Input } from 'UI';
import { jump } from 'Player';
import { LEVEL } from 'Types/session/log';
import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock';
import stl from './console.module.css';

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
        const { logs, isResult, additionalHeight, lastIndex } = this.props;
        const { filter, activeTab } = this.state;
        const filterRE = getRE(filter, 'i');
        const filtered = logs.filter(({ level, value }) =>
            activeTab === ALL ? filterRE.test(value) : filterRE.test(value) && LEVEL_TAB[level] === activeTab
        );

        return (
            <>
                <BottomBlock style={{ height: 300 + additionalHeight + 'px' }}>
                    <BottomBlock.Header showClose={!isResult}>
                        <div className="flex items-center">
                            <span className="font-semibold color-gray-medium mr-4">Console</span>
                            <Tabs tabs={TABS} active={activeTab} onClick={this.onTabClick} border={false} />
                        </div>
                        <Input
                            className="input-small"
                            placeholder="Filter by keyword"
                            icon="search"
                            iconPosition="left"
                            name="filter"
                            onChange={this.onFilterChange}
                        />
                    </BottomBlock.Header>
                    <BottomBlock.Content>
                        <NoContent
                            title={<div className="capitalize flex items-center mt-16">
                                <Icon name="info-circle" className="mr-2" size="18" />
                                No {activeTab === ALL ? 'Data' : activeTab.toLowerCase()}</div>}
                            size="small"
                            show={filtered.length === 0}
                        >
                            <Autoscroll>
                                {filtered.map((l, index) => (
                                    <div
                                        key={l.key}
                                        className={cn(stl.line, {
                                            info: !l.isYellow() && !l.isRed(),
                                            warn: l.isYellow(),
                                            error: l.isRed(),
                                            'cursor-pointer': !isResult,
                                            [stl.activeRow]: lastIndex === index,
                                        })}
                                        data-scroll-item={l.isRed()}
                                        onClick={() => !isResult && jump(l.time)}
                                    >
                                        <Icon size="14" className={stl.icon} {...getIconProps(l.level)} />
                                        <div className={stl.message}>{renderWithNL(l.value)}</div>
                                    </div>
                                ))}
                            </Autoscroll>
                        </NoContent>
                    </BottomBlock.Content>
                </BottomBlock>
            </>
        );
    }
}

import {LockOutlined, TeamOutlined} from '@ant-design/icons';
import {Empty, Switch, Table, TableColumnsType, Tag, Tooltip, Typography} from 'antd';
import {observer} from 'mobx-react-lite';
import React from 'react';
import {connect} from 'react-redux';
import {withRouter} from 'react-router-dom';

import {checkForRecent} from 'App/date';
import {useStore} from 'App/mstore';
import Dashboard from 'App/mstore/types/dashboard';
import {dashboardSelected, withSiteId} from 'App/routes';

import AnimatedSVG, {ICONS} from 'Shared/AnimatedSVG/AnimatedSVG';
import CreateDashboardButton from "Components/Dashboard/components/CreateDashboardButton";
import {useHistory} from "react-router";

function DashboardList({siteId}: { siteId: string }) {
    const {dashboardStore} = useStore();
    const list = dashboardStore.filteredList;
    const dashboardsSearch = dashboardStore.filter.query;
    const history = useHistory();


    const tableConfig: TableColumnsType<Dashboard> = [
        {
            title: 'Title',
            dataIndex: 'name',
            width: '25%',
            render: (t) => <div className="link capitalize-first">{t}</div>,
        },
        {
            title: 'Description',
            ellipsis: {
                showTitle: false,
            },
            width: '25%',
            dataIndex: 'description',
        },
        {
            title: 'Last Modified',
            dataIndex: 'updatedAt',
            width: '16.67%',
            sorter: (a, b) => a.updatedAt.toMillis() - b.updatedAt.toMillis(),
            sortDirections: ['ascend', 'descend'],
            render: (date) => checkForRecent(date, 'LLL dd, yyyy, hh:mm a'),
        },
        {
            title: 'Modified By',
            dataIndex: 'updatedBy',
            width: '16.67%',
            sorter: (a, b) => a.updatedBy.localeCompare(b.updatedBy),
            sortDirections: ['ascend', 'descend'],
        },
        {
            title: (
                <div className={'flex items-center justify-between'}>
                    <div>Visibility</div>
                    <Switch checked={!dashboardStore.filter.showMine} onChange={() =>
                        dashboardStore.updateKey('filter', {
                            ...dashboardStore.filter,
                            showMine: !dashboardStore.filter.showMine,
                        })} checkedChildren={'Public'} unCheckedChildren={'Private'}/>
                </div>
            ),
            width: '16.67%',
            dataIndex: 'isPublic',
            render: (isPublic: boolean) => (
                <Tag icon={isPublic ? <TeamOutlined/> : <LockOutlined/>}>
                    {isPublic ? 'Team' : 'Private'}
                </Tag>
            ),
        },
    ];
    return (
        list.length === 0 && !dashboardStore.filter.showMine ? (
            <Empty
                image={<AnimatedSVG name={dashboardsSearch !== '' ? ICONS.NO_RESULTS : ICONS.NO_DASHBOARDS} size={600}/>}

                imageStyle={{height: 300}}
                description={(
                    <div className="text-center">
                        <div>
                            <Typography.Text className="my-2 text-xl font-medium">
                                Create your first dashboard.
                            </Typography.Text>
                            <div className="mb-2 text-lg text-gray-500 mt-2 leading-normal">
                                Organize your product and technical insights as cards in dashboards to see the bigger picture, <br/>take action and improve user experience.
                            </div>
                            <div className="my-4">
                                <CreateDashboardButton/>
                            </div>
                        </div>
                    </div>
                )}
            />
        ) : (
            <Table
                dataSource={list}
                columns={tableConfig}
                pagination={{
                    showTotal: (total, range) =>
                        `Showing ${range[0]}-${range[1]} of ${total} items`,
                    size: 'small',
                }}
                onRow={(record) => ({
                    onClick: () => {
                        dashboardStore.selectDashboardById(record.dashboardId);
                        const path = withSiteId(
                            dashboardSelected(record.dashboardId),
                            siteId
                        );
                        history.push(path);
                    },
                })}
            />)
    );
    
}

export default connect((state: any) => ({
    siteId: state.getIn(['site', 'siteId']),
}))(observer(DashboardList));

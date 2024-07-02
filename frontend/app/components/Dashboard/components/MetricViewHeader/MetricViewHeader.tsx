import React from 'react';
import {PageTitle, Toggler, Icon} from "UI";
import {Segmented, Button} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import MetricsSearch from '../MetricsSearch';
import Select from 'Shared/Select';
import {useStore} from 'App/mstore';
import {observer, useObserver} from 'mobx-react-lite';
import {DROPDOWN_OPTIONS} from 'App/constants/card';
import AddCardModal from 'Components/Dashboard/components/AddCardModal';
import {useModal} from 'Components/Modal';
import AddCardSelectionModal from "Components/Dashboard/components/AddCardSelectionModal";
import NewDashboardModal from "Components/Dashboard/components/DashboardList/NewDashModal";

function MetricViewHeader({siteId}: { siteId: string }) {
    const {metricStore} = useStore();
    const filter = metricStore.filter;
    const {showModal} = useModal();
    const [showAddCardModal, setShowAddCardModal] = React.useState(false);

    return (
        <div>
            <div className='flex items-center justify-between px-6'>
                <div className='flex items-baseline mr-3'>
                    <PageTitle title='Cards' className=''/>
                </div>
                <div className='ml-auto flex items-center'>
                    <Button type='primary'
                        // onClick={() => showModal(<AddCardModal siteId={siteId}/>, {right: true})}
                            onClick={() => setShowAddCardModal(true)}
                            icon={<PlusOutlined />}
                    >Create Card</Button>
                    <div className='ml-4 w-1/4' style={{minWidth: 300}}>
                        <MetricsSearch/>
                    </div>
                </div>
            </div>

            <div className='border-y px-6 py-1 mt-2 flex items-center w-full justify-between'>
                <div className='items-center flex gap-4'>
                    <Select
                        options={[{label: 'All Types', value: 'all'}, ...DROPDOWN_OPTIONS]}
                        name='type'
                        defaultValue={filter.type}
                        onChange={({value}) =>
                            metricStore.updateKey('filter', {...filter, type: value.value})
                        }
                        plain={true}
                        isSearchable={true}
                    />

                    <DashboardDropdown
                        plain={false}
                        onChange={(value: any) =>
                            metricStore.updateKey('filter', {...filter, dashboard: value})
                        }
                    />
                </div>

                <div className='flex items-center gap-2'>
                    <ListViewToggler/>

                    <Select
                        options={[
                            {label: 'Newest', value: 'desc'},
                            {label: 'Oldest', value: 'asc'}
                        ]}
                        name='sort'
                        defaultValue={metricStore.sort.by}
                        onChange={({value}) => metricStore.updateKey('sort', {by: value.value})}
                        plain={true}
                        className='ml-4'
                    />
                    <Toggler
                        label='My Cards'
                        checked={filter.showMine}
                        name='test'
                        className='font-medium mr-2'
                        onChange={() =>
                            metricStore.updateKey('filter', {...filter, showMine: !filter.showMine})
                        }
                    />
                </div>

                {/*<AddCardSelectionModal open={showAddCardModal}/>*/}
                <NewDashboardModal
                    onClose={() => setShowAddCardModal(false)}
                    open={showAddCardModal}
                    isCreatingNewCard={true}
                />
            </div>
        </div>
    );
}

export default observer(MetricViewHeader);

function DashboardDropdown({onChange, plain = false}: { plain?: boolean; onChange: any }) {
    const {dashboardStore, metricStore} = useStore();
    const dashboardOptions = dashboardStore.dashboards.map((i: any) => ({
        key: i.id,
        label: i.name,
        value: i.dashboardId
    }));

    return (
        <Select
            isSearchable={true}
            placeholder='Filter by Dashboard'
            plain={plain}
            options={dashboardOptions}
            value={metricStore.filter.dashboard}
            onChange={({value}: any) => onChange(value)}
            isMulti={true}
            color='black'
        />
    );
}

function ListViewToggler() {
    const {metricStore} = useStore();
    const listView = useObserver(() => metricStore.listView);
    return (
        <div className='flex items-center'>
            <Segmented 
                size='small'
                options={[
                    {
                        label: <div className={'flex items-center gap-2'}>
                            <Icon name={'list-alt'} color={'inherit'}/>
                            <div>List</div>
                        </div>,
                        value: 'list'
                    },
                    {
                        label: <div className={'flex items-center gap-2'}>
                            <Icon name={'grid'} color={'inherit'}/>
                            <div>Grid</div>
                        </div>,
                        value: 'grid'
                    }
                ]}
                onChange={(val) => {
                    metricStore.updateKey('listView', val === 'list')
                }}
                value={listView ? 'list' : 'grid'}
            />
        </div>
    );
}

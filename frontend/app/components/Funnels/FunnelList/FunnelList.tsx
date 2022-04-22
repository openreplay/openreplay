import { PageTitle, Button, Pagination, Icon, Loader } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { sliceListPerPage } from 'App/utils';
import FunnelItem from '../FunnelItem/FunnelItem';
import FunnelSearch from '../FunnelSearch';

function FunnelList(props) {
    const { funnelStore } = useStore()
    const list = useObserver(() => funnelStore.list)
    const loading = useObserver(() => funnelStore.isLoading)

    useEffect(() => {
        if (list.length === 0) {
            funnelStore.fetchFunnels()
        }
    }, [])

    return (
        <Loader loading={loading}>
            <div className="flex items-center">
                <div className="flex items-center">
                    <PageTitle title='Funnels' className="mr-3" />
                    <Button primary size="small" onClick={() => {}}>New Funnel</Button>
                </div>
                <div className="ml-auto w-1/4">
                    <FunnelSearch />
                </div>
            </div>

            <div className="color-gray-medium mt-2 mb-4">Funnels make it easy to uncover the most significant issues that impacted conversions.</div>

            <div className="mt-3 border rounded bg-white">
                <div className="grid grid-cols-12 p-3 font-medium">
                    <div className="col-span-4 flex items-center">
                        <Icon name="funnel-fill"/> <span className="ml-2">Title</span>
                    </div>
                    <div className="col-span-3">Owner</div>
                    <div className="col-span-3">Last Modified</div>
                </div>

                {sliceListPerPage(list, funnelStore.page - 1, funnelStore.pageSize).map((funnel: any) => (
                    <FunnelItem funnel={funnel} />
                ))}
            </div>

            <div className="w-full flex items-center justify-center py-8">
                <Pagination
                    page={funnelStore.page}
                    totalPages={Math.ceil(list.length / funnelStore.pageSize)}
                    onPageChange={(page) => funnelStore.updateKey('page', page)}
                    limit={funnelStore.pageSize}
                    debounceRequest={100}
                />
            </div>
        </Loader>
    );
}

export default FunnelList;
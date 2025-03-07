import { useModal } from 'App/components/Modal';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Loader, Pagination } from 'UI';
import { Button } from 'antd'
import SessionsModal from './SessionsModal';
import CardUserItem from './CardUserItem';
import { useStore } from 'App/mstore';
import { useNavigate, useLocation } from 'react-router';

function CardUserList() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const { showModal } = useModal();
    const userId = new URLSearchParams(location.search).get("userId");
    const { metricStore, dashboardStore } = useStore();
    
    const [data, setData] = useState<any>([
        { name: 'user@domain.com', sessions: 29 },
        { name: 'user@domain.com', sessions: 29 },
        { name: 'user@domain.com', sessions: 29 },
        { name: 'user@domain.com', sessions: 29 },
    ]);
    const pageSize = data.length;

    const handleClick = (issue: any) => {
        const search = (new URLSearchParams({userId : '123'})).toString()
        navigate(location.pathname + "?" + search, { replace: true });
        // showModal(<SessionsModal list={[]} />, { right: true, width: 450 })
    }

    useEffect(() => {
        if (!userId) return;

        showModal(<SessionsModal userId={userId} name="test" hash="test" />, { right: true, width: 600, onClose: () => {
            if (location.pathname.includes("/metric")) {
                navigate(location.pathname, { replace: true });
            }
        }});
    }, [userId]);

    return (
        <div className="bg-white rounded p-4 border">
            <div className="flex justify-between">
                <h1 className="font-medium text-2xl">Returning users between</h1>
                <div>
                    <Button type="text">All Sessions</Button>
                </div>
            </div>

            <Loader loading={loading}>
                {data.map((item: any, index: any) => (
                    <div key={index} onClick={() => handleClick(item)}>
                        <CardUserItem user={item} />
                    </div>
                ))}
            </Loader>

            <div className="w-full flex items-center justify-between pt-4">
                <div className="text-disabled-text">
                Showing <span className="font-medium">{Math.min(data.length, pageSize)}</span> out of{' '}
                <span className="font-medium">{data.length}</span> Issues
                </div>
                <Pagination
                    page={metricStore.sessionsPage}
                    total={data.length}
                    onPageChange={(page: any) => metricStore.updateKey('sessionsPage', page)}
                    limit={metricStore.sessionsPageSize}
                    debounceRequest={500}
                />
            </div>
        </div>
    );
}

export default observer(CardUserList);
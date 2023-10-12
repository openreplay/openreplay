import { useModal } from 'App/components/Modal';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { Loader, Pagination, Button } from 'UI';
import SessionsModal from './SessionsModal';
import CardUserItem from './CardUserItem';
import { useStore } from 'App/mstore';

interface Props {
    history: any;
    location: any;
}
function CardUserList(props: RouteComponentProps<Props>) {
    const [loading, setLoading] = useState(false);
    const { showModal } = useModal();
    const userId = new URLSearchParams(props.location.search).get("userId");
    const { metricStore, dashboardStore } = useStore();
    
    const [data, setData] = useState<any>([
        { name: 'user@domain.com', sessions: 29 },
        { name: 'user@domain.com', sessions: 29 },
        { name: 'user@domain.com', sessions: 29 },
        { name: 'user@domain.com', sessions: 29 },
    ]);
    const pageSize = data.length;

    const handleClick = (issue: any) => {
        props.history.replace({search: (new URLSearchParams({userId : '123'})).toString()});
        // showModal(<SessionsModal list={[]} />, { right: true, width: 450 })
    }

    useEffect(() => {
        if (!userId) return;

        showModal(<SessionsModal userId={userId} name="test" hash="test" />, { right: true, width: 600, onClose: () => {
            if (props.history.location.pathname.includes("/metric")) {
                props.history.replace({search: ""});
            }
        }});
    }, [userId]);

    return (
        <div className="my-8 bg-white rounded p-4 border">
            <div className="flex justify-between">
                <h1 className="font-medium text-2xl">Returning users between</h1>
                <div>
                    <Button variant="text-primary">All Sessions</Button>
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
                Showing <span className="font-semibold">{Math.min(data.length, pageSize)}</span> out of{' '}
                <span className="font-semibold">{data.length}</span> Issues
                </div>
                <Pagination
                    page={metricStore.sessionsPage}
                    totalPages={Math.ceil(data.length / metricStore.sessionsPageSize)}
                    onPageChange={(page: any) => metricStore.updateKey('sessionsPage', page)}
                    limit={metricStore.sessionsPageSize}
                    debounceRequest={500}
                />
            </div>
        </div>
    );
}

export default withRouter(observer(CardUserList));
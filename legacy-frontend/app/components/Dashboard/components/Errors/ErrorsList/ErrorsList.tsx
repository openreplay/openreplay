import React, { useEffect } from 'react';
import ErrorListItem from '../ErrorListItem';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

function ErrorsList(props) {
    const { errorStore, metricStore } = useStore();
    const metric = useObserver(() => metricStore.instance);

    useEffect(() => {
        errorStore.fetchErrors();
    }, []);
    return (
        <div>
            Errors List
            <ErrorListItem error={{}} />
        </div>
    );
}

export default ErrorsList;
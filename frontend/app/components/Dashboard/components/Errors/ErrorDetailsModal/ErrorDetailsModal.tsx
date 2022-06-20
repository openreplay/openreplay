import React, { useEffect } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { NoContent } from 'UI';
// import ErrorDetails from '../ErrorDetails/ErrorDetails';
import ErrorInfo from '../../../../Errors/Error/ErrorInfo';

interface Props {
    errorId: any
}
function ErrorDetailsModal(props: RouteComponentProps) {
    const [error, setError] = React.useState(null);
    // const [loading, setLoading] = React.useState(true);
    // const { metricStore } = useStore();
    
    // const fetchData = async () => {
    //     await metricStore.fetchError(props.errorId).then(setError);
    //     setLoading(false);
    // }
    // useEffect(() => {
    //     // console.log('errorId', props.errorId);
    //     fetchData();
    // }, [])

    return (
        <div style={{ width: '85vw', maxWidth: '1200px' }} className="bg-white h-screen p-4 overflow-y-auto">
            {/* <NoContent show={!loading && !error}> */}
                {/* <ErrorDetails error={error} /> */}
                <ErrorInfo errorId={props.errorId} list={[]} />
            {/* </NoContent> */}
        </div>
    );
}

export default withRouter(ErrorDetailsModal);
import React, { useEffect } from 'react';
import { Pagination, NoContent } from 'UI';
import ErrorListItem from '../../../components/Errors/ErrorListItem';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { useModal } from 'App/components/Modal';
import ErrorDetailsModal from '../../../components/Errors/ErrorDetailsModal';

const PER_PAGE = 5;
interface Props {
    metric: any;
    isTemplate?: boolean;
    isEdit?: boolean;
    history: any,
}
function CustomMetricTableErrors(props: RouteComponentProps<Props>) {
    const { metric, isEdit = false } = props;
    const errorId = new URLSearchParams(props.location.search).get("errorId");
    const { showModal } = useModal();

    const onErrorClick = (error: any) => {
        props.history.replace({search: (new URLSearchParams({errorId : error.errorId})).toString()});
    }

    useEffect(() => {
        if (!errorId) return;

        showModal(<ErrorDetailsModal errorId={errorId} />, { right: true, onClose: () => {
            props.history.replace({search: ""});
        }});
    }, [errorId])

    return (
        <NoContent show={metric.data.errors && metric.data.errors === 0}>
            {metric.data.errors && metric.data.errors.map((error: any, index: any) => (
                <ErrorListItem error={error} onClick={() => onErrorClick(error)} />
            ))}

            {isEdit && (
                <div className="my-6 flex items-center justify-center">
                    <Pagination
                        page={metric.page}
                        totalPages={Math.ceil(metric.data.total / metric.limit)}
                        onPageChange={(page: any) => metric.updateKey('page', page)}
                        limit={metric.limit}
                        debounceRequest={500}
                    />
                </div>
            )}

            {!isEdit && (
                <ViewMore total={metric.data.total} limit={metric.limit} />
            )}
        </NoContent>
    );
}

export default withRouter(CustomMetricTableErrors) as React.FunctionComponent<RouteComponentProps<Props>>;

const ViewMore = ({ total, limit }: any) => total > limit && (
    <div className="my-4 flex items-center justify-center cursor-pointer w-fit mx-auto">
        <div className="text-center">
            <div className="color-teal text-lg">
                All <span className="font-medium">{total}</span> errors
            </div>
        </div>
    </div>
);
import React from 'react';
import { Pagination } from 'UI';
import ErrorListItem from '../../../components/Errors/ErrorListItem';

const PER_PAGE = 5;
interface Props {
    metric: any;
    isTemplate?: boolean;
    isEdit?: boolean;
}
function CustomMetricTableErrors(props: Props) {
    const { metric, isEdit = false } = props;

    return (
        <div>
            {metric.data.errors && metric.data.errors.map((error: any, index: any) => (
                <ErrorListItem error={error} />
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
        </div>
    );
}

export default CustomMetricTableErrors;

const ViewMore = ({ total, limit }: any) => total > limit && (
    <div className="my-4 flex items-center justify-center cursor-pointer w-fit mx-auto">
        <div className="text-center">
            <div className="color-teal text-lg">
                All <span className="font-medium">{total}</span> errors
            </div>
        </div>
    </div>
);
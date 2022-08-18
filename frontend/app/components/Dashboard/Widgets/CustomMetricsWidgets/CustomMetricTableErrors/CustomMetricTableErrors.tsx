import React, { useEffect } from "react";
import { Pagination, NoContent, Icon } from "UI";
import ErrorListItem from "App/components/Dashboard/components/Errors/ErrorListItem";
import { withRouter, RouteComponentProps } from "react-router-dom";
import { useModal } from "App/components/Modal";
import ErrorDetailsModal from "App/components/Dashboard/components/Errors/ErrorDetailsModal";
import { useStore } from "App/mstore";
interface Props {
    metric: any;
    data: any;
    isEdit: any;
    history: any;
    location: any;
}
function CustomMetricTableErrors(props: RouteComponentProps & Props) {
    const { metric, isEdit = false, data } = props;
    const errorId = new URLSearchParams(props.location.search).get("errorId");
    const { showModal, hideModal } = useModal();
    const { dashboardStore } = useStore();

    const onErrorClick = (e: any, error: any) => {
        e.stopPropagation();
        props.history.replace({
            search: new URLSearchParams({ errorId: error.errorId }).toString(),
        });
    };

    useEffect(() => {
        if (!errorId) return;

        showModal(<ErrorDetailsModal errorId={errorId} />, {
            right: true,
            onClose: () => {
                if (props.history.location.pathname.includes("/dashboard") || props.history.location.pathname.includes("/metrics/")) {
                    props.history.replace({ search: "" });
                }
            },
        });

        return () => {
            hideModal();
        };
    }, [errorId]);

    return (
        <NoContent
            title={<div className="flex items-center"><Icon name="info-circle" size={18} className="mr-2" />No data for the selected time period</div>}
            show={!data.errors || data.errors.length === 0}
            size="small"
            style={{ minHeight: 220 }}
        >
            <div className="pb-4">
                {data.errors &&
                    data.errors.map((error: any, index: any) => (
                        <div key={index} className="border-b last:border-none">
                            <ErrorListItem
                                error={error}
                                onClick={(e) => onErrorClick(e, error)}
                            />
                        </div>
                    ))}

                {isEdit && (
                    <div className="my-6 flex items-center justify-center">
                        <Pagination
                            page={metric.page}
                            totalPages={Math.ceil(
                                data.total / metric.limit
                            )}
                            onPageChange={(page: any) =>
                                metric.updateKey("page", page)
                            }
                            limit={metric.limit}
                            debounceRequest={500}
                        />
                    </div>
                )}

                {!isEdit && (
                    <ViewMore total={data.total} limit={metric.limit} />
                )}
            </div>
        </NoContent>
    );
}

export default withRouter<Props & RouteComponentProps, React.FunctionComponent>(CustomMetricTableErrors);

const ViewMore = ({ total, limit }: any) =>
    total > limit && (
        <div className="mt-4 flex items-center justify-center cursor-pointer w-fit mx-auto">
            <div className="text-center">
                <div className="color-teal text-lg">
                    All <span className="font-medium">{total}</span> errors
                </div>
            </div>
        </div>
    );

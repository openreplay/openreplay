import React, { useEffect } from "react";
import { Pagination, NoContent, Icon } from "UI";
import ErrorListItem from "App/components/Dashboard/components/Errors/ErrorListItem";
import { useLocation, useNavigate } from "react-router";
import { useModal } from "App/components/Modal";
import ErrorDetailsModal from "App/components/Dashboard/components/Errors/ErrorDetailsModal";

interface Props {
    metric: any;
    data: any;
    isEdit: any;
}
function CustomMetricTableErrors(props: Props) {
    const { metric, data } = props;
    const location = useLocation();
    const navigate = useNavigate();
    const errorId = new URLSearchParams(location.search).get("errorId");
    const { showModal, hideModal } = useModal();

    const onErrorClick = (e: any, error: any) => {
        e.stopPropagation();
        const search = new URLSearchParams({ errorId: error.errorId }).toString()
        navigate(location.pathname + "?" + search, { replace: true });
    };

    useEffect(() => {
        if (!errorId) return;

        showModal(<ErrorDetailsModal errorId={errorId} />, {
            right: true,
            width: 1200,
            onClose: () => {
                if (location.pathname.includes("/dashboard") || location.pathname.includes("/metrics/")) {
                    navigate(location.pathname, { replace: true });
                }
            },
        });

        return () => {
            hideModal();
        };
    }, [errorId]);

    return (
        <NoContent
            title={<div className="flex items-center"><Icon name="info-circle" size={14} className="mr-2" />No data available for the selected period.</div>}
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

                <div className="my-6 flex items-center justify-center">
                    <Pagination
                        page={metric.page}
                        total={data.total}
                        onPageChange={(page: any) =>
                            metric.updateKey("page", page)
                        }
                        limit={5}
                        debounceRequest={500}
                    />
                </div>
            </div>
        </NoContent>
    );
}

export default CustomMetricTableErrors;

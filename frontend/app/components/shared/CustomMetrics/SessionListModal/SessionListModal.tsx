import React, { useEffect } from 'react';
import { SlideModal, NoContent } from 'UI';
import SessionItem from 'Shared/SessionItem';
import stl from './SessionListModal.css';
import { connect } from 'react-redux';
import { fetchSessionList, setActiveWidget } from 'Duck/customMetrics';

interface Props {
    loading: boolean;
    list: any;
    fetchSessionList: (params) => void;
    activeWidget: any;
    setActiveWidget: (widget) => void;
}
function SessionListModal(props: Props) {
    const { activeWidget, loading, list } = props;
    useEffect(() => {
        if (!activeWidget || !activeWidget.widget) return;
        props.fetchSessionList({ 
            metricId: activeWidget.widget.metricId,
            startDate: activeWidget.startTimestamp,
            endDate: activeWidget.endTimestamp
        });
    }, [activeWidget]);

    console.log('SessionListModal', activeWidget);
    return (
        <SlideModal
            title={ activeWidget && (
                <div className="flex items-center">
                    <span className="mr-3">{ 'Custom Metric: ' + activeWidget.widget.name } </span>
                </div>
            )}
            isDisplayed={ !!activeWidget }
            onClose={ () => props.setActiveWidget(null)}
            // size="medium"
            content={ activeWidget && (
                <div className="">
                    <NoContent 
                        show={ !loading && (list.length === 0 || list.size === 0 )}
                        title="No recordings found."
                    >
                        <div className={ stl.wrapper }>
                            { list && list.map(session => <SessionItem key={ session.sessionId } session={ session } />) }
                        </div>
                    </NoContent> 
                </div>
            )}
        />
    );
}

export default connect(state => ({
    loading: state.getIn(['customMetrics', 'sessionListRequest', 'loading']),
    list: state.getIn(['customMetrics', 'sessionList']),
    activeWidget: state.getIn(['customMetrics', 'activeWidget']),
}), { fetchSessionList, setActiveWidget })(SessionListModal);

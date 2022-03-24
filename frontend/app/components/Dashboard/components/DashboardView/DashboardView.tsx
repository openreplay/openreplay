import React, { useEffect } from 'react';
import WidgetWrapper from '../../WidgetWrapper';
import { observer } from 'mobx-react-lite';
import { withDashboardStore } from '../../store/store';
import { Button, PageTitle, Link } from 'UI';
import { withSiteId, dashboardMetricCreate } from 'App/routes';
import { ModalContext } from "App/components/Modal/modalContext";

const ModalContent = () => {
    let { handleModal } = React.useContext(ModalContext);
    return (
        <div className="h-screen bg-white relative p-5 shadow-lg" style={{ width: '300px'}}>
          Hello this is test
        </div>
    )
}

function DashboardView(props) {
    let { handleModal } = React.useContext(ModalContext);
    const { store } = props;
    const dashboard = store.selectedDashboard
    const list = dashboard?.widgets;
    useEffect(() => {
        handleModal(<ModalContent />)
    }, [])
    return (
        <div>
            <div className="flex items-center mb-4">
                <PageTitle title={dashboard.name} className="mr-3" />
                <Link to={withSiteId(dashboardMetricCreate(dashboard.dashboardId), store.siteId)}><Button primary size="small">Add Metric</Button></Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {list && list.map(item => <WidgetWrapper widget={item} key={item.widgetId} />)}
            </div>
        </div>
    )
}

export default withDashboardStore(observer(DashboardView));
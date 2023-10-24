import React, {lazy, Suspense, useEffect, useRef} from 'react';
import Router from './Router';
import {connect, ConnectedProps} from 'react-redux';
import {Switch, Route, Redirect, withRouter, RouteComponentProps, BrowserRouter} from 'react-router-dom';
import * as routes from './routes';
import * as managedSaasRoutes from './managed-saas-routes';
import withSiteIdUpdater from 'HOCs/withSiteIdUpdater';

const withSiteId = routes.withSiteId;
import {Map} from 'immutable';

const AdminConsolePure = lazy(() => import('Components/AdminConsole/AdminConsoleView'))
const AdminConsole = withSiteIdUpdater(AdminConsolePure)
const ADMIN_CONSOLE_PATH = managedSaasRoutes.adminConsole();

interface Props extends RouteComponentProps, ConnectedProps<typeof connector> {
    sites: Map<string, any>;
}

function AdditionalRoutes(props: Props) {
    const {sites} = props;
    const siteIdList: any = sites.map(({id}) => id).toJS();
    console.log('test')
    return (
        <>
            <Route exact strict path={withSiteId(ADMIN_CONSOLE_PATH, siteIdList)}
                   component={AdminConsole}/>
        </>
    );
}

const mapStateToProps = (state: Map<string, any>) => ({
    sites: state.getIn(['site', 'list'])
});

export default connect(mapStateToProps, null)(AdditionalRoutes);
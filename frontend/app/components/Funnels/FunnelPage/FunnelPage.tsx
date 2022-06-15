import React from 'react';
import { Switch, Route } from 'react-router';
import FunnelDetails from '../FunnelDetails/FunnelDetails';
import FunnelList from '../FunnelList';

function FunnelPage(props) {
    return (
        <div className="page-margin container-70">
            <Switch>
                <Route path="/">
                    <FunnelList />
                </Route>
                
                <Route path="/funnel/create">
                    <FunnelDetails />
                </Route>

                {/* <Route path="/funnel/:id">
                    <FunnelDetail />
                </Route> */}
            </Switch>
        </div>
    );
}

export default FunnelPage;
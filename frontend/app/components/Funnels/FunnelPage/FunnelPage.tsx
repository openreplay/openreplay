import React from 'react';
import { Switch, Route } from 'react-router';
import FunnelList from '../FunnelList';

function FunnelPage(props) {
    return (
        <div className="page-margin container-70">
            <Switch>
                <Route path="/">
                    <FunnelList />
                </Route>
            </Switch>
        </div>
    );
}

export default FunnelPage;
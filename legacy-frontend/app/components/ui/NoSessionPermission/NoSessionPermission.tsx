import React from "react";
import stl from "./NoSessionPermission.module.css";
import { Icon, Button } from "UI";
import { connect } from "react-redux";
import {
    sessions as sessionsRoute,
    assist as assistRoute,
    withSiteId,
} from "App/routes";
import { withRouter, RouteComponentProps } from "react-router-dom";
const SESSIONS_ROUTE = sessionsRoute();
const ASSIST_ROUTE = assistRoute();

interface Props extends RouteComponentProps {
    session: any;
    siteId: string;
    history: any;
    sessionPath: any;
    isAssist: boolean;
}
function NoSessionPermission(props: Props) {
    const { session, history, siteId, sessionPath, isAssist } = props;

    const backHandler = () => {
        if (
            sessionPath.pathname === history.location.pathname ||
            sessionPath.pathname.includes("/session/") ||
            isAssist
        ) {
            history.push(
                withSiteId(isAssist ? ASSIST_ROUTE : SESSIONS_ROUTE, siteId)
            );
        } else {
            history.push(
                sessionPath
                    ? sessionPath.pathname + sessionPath.search
                    : withSiteId(SESSIONS_ROUTE, siteId)
            );
        }
    };

    return (
        <div className={stl.wrapper}>
            <Icon name="shield-lock" size="50" className="py-16" />
            <div className={stl.title}>Not allowed</div>
            {session.isLive ? (
                <span>
                    This session is still live, and you don’t have the necessary
                    permissions to access this feature. Please check with your
                    admin.
                </span>
            ) : (
                <span>
                    You don’t have the necessary permissions to access this
                    feature. Please check with your admin.
                </span>
            )}
            {/* <Link to="/"> */}
            <Button variant="primary" onClick={backHandler} className="mt-6">
                GO BACK
            </Button>
            {/* </Link> */}
        </div>
    );
}

export default withRouter(
    connect((state: any) => {
        const isAssist = window.location.pathname.includes("/assist/");
        return {
            isAssist,
            session: state.getIn(["sessions", "current"]),
            siteId: state.getIn(["site", "siteId"]),
            sessionPath: state.getIn(["sessions", "sessionPath"]),
        };
    })(NoSessionPermission)
);

import React from 'react';
import { Icon, Button } from 'UI';
import { connect } from 'react-redux';
import { onboarding as onboardingRoute } from 'App/routes';
import { withRouter } from 'react-router-dom';
import * as routes from '../../../routes';
const withSiteId = routes.withSiteId;

const NoSessionsMessage = (props) => {
    const {
        sites,
        match: {
            params: { siteId },
        },
    } = props;
    const activeSite = sites.find((s) => s.id == siteId);
    const showNoSessions = !!activeSite && !activeSite.recorded;
    return (
        <>
            {showNoSessions && (
                <div>
                    <div
                        className="rounded text-sm flex items-center p-2 justify-between mb-4"
                        style={{ backgroundColor: 'rgba(255, 239, 239, 1)', border: 'solid thin rgba(221, 181, 181, 1)' }}
                    >
                        <div className="flex items-center w-full">
                            <div className="flex-shrink-0 w-8 flex justify-center">
                                <Icon name="info-circle" size="14" color="gray-darkest" />
                            </div>
                            <div className="ml-2 color-gray-darkest mr-auto text-base">
                                It might take a few minutes for first recording to appear. 
                                <a href="https://docs.openreplay.com/troubleshooting" className="link ml-2">
                                    Troubleshoot
                                </a>
                                .
                            </div>
                            <Button
                                variant="primary"
                                className="bg-white h-8 hover:bg-gray-light text-base"
                                onClick={() => props.history.push(withSiteId(onboardingRoute('installing'), siteId))}
                            >
                                Complete Project Setup
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default connect((state) => ({
    site: state.getIn(['site', 'siteId']),
    sites: state.getIn(['site', 'list']),
}))(withRouter(NoSessionsMessage));

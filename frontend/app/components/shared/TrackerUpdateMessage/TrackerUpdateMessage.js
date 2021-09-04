import React from 'react'
import { Icon } from 'UI'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom';
import { onboarding as onboardingRoute } from 'App/routes'
import { withSiteId } from 'App/routes';

const TrackerUpdateMessage= (props) => {
  // const { site } = props;
  const { site, sites, match: { params: { siteId } } } = props;
  const activeSite = sites.find(s => s.id == siteId);
  const hasSessions = !!activeSite && !activeSite.recorded;
  const needUpdate = !hasSessions && site.trackerVersion !== window.ENV.TRACKER_VERSION;
  return needUpdate ? (
    <>
      {(
        <div>
          <div
            className="rounded text-sm flex items-center p-2 justify-between mb-4"
            style={{ backgroundColor: 'rgba(255, 239, 239, 1)', border: 'solid thin rgba(221, 181, 181, 1)'}}
          >
            <div className="flex items-center w-full">
              <div className="flex-shrink-0 w-8 flex justify-center">
                <Icon name="info-circle" size="14" color="gray-darkest" />
              </div>
              <div className="ml-2color-gray-darkest mr-auto">
                Please <a href="#" className="link" onClick={() => props.history.push(withSiteId(onboardingRoute('installing'), siteId))}>update</a> your tracker (Asayer) to the latest OpenReplay version  ({window.ENV.TRACKER_VERSION}) to benefit from all new features we recently shipped.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  ) : ''
}

export default connect(state => ({
  site: state.getIn([ 'site', 'instance' ]),
  sites: state.getIn([ 'site', 'list' ])
}))(withRouter(TrackerUpdateMessage))
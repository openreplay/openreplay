import React, { useEffect } from 'react'
import { Icon } from 'UI'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom';
import { onboarding as onboardingRoute } from 'App/routes'
import { withSiteId } from 'App/routes';
import { isGreaterOrEqualVersion } from 'App/utils'

const TrackerUpdateMessage= (props) => {
  const [needUpdate, setNeedUpdate] = React.useState(false)
  const { sites, match: { params: { siteId } } } = props;
  const activeSite = sites.find(s => s.id == siteId);
  
  useEffect(() => {
    if (!activeSite || !activeSite.trackerVersion) return;

    const isLatest = isGreaterOrEqualVersion(activeSite.trackerVersion, window.env.TRACKER_VERSION);
    if (!isLatest && activeSite.recorded) {
      setNeedUpdate(true)
    }
  }, [activeSite])

  return needUpdate ? (
    <>
      {(
        <div>
          <div
            className="rounded text-sm flex items-center justify-between mb-4"
            style={{ height: '42px', backgroundColor: 'rgba(255, 239, 239, 1)', border: 'solid thin rgba(221, 181, 181, 1)'}}
          >
            <div className="flex items-center w-full">
              <div className="flex-shrink-0 w-8 flex justify-center">
                <Icon name="info-circle" size="14" color="gray-darkest" />
              </div>
              <div className="ml-2color-gray-darkest mr-auto">
                There might be a mismatch between the tracker and the backend versions. Please make sure to <a href="#" className="link" onClick={() => props.history.push(withSiteId(onboardingRoute('installing'), siteId))}>update</a> the tracker to latest version (<a href="https://www.npmjs.com/package/@openreplay/tracker" target="_blank">{window.env.TRACKER_VERSION}</a>).
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
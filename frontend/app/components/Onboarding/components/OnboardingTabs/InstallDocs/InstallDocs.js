import React, { useState } from 'react'
import { connect } from 'react-redux'
import stl from './installDocs.css'
import cn from 'classnames'
import Highlight from 'react-highlight'
import CircleNumber from '../../CircleNumber'
import { Slider, CopyButton } from 'UI'

const installationCommand = 'npm i @openreplay/tracker'
const usageCode = `import Tracker from '@openreplay/tracker';

const tracker = new Tracker({
  projectKey: "PROJECT_KEY",
  ingestPoint: "https://${window.location.hostname}/ingest",
});
tracker.start();`
const usageCodeSST = `import Tracker from '@openreplay/tracker/cjs';

const tracker = new Tracker({
  projectKey: "PROJECT_KEY",
  ingestPoint: "https://${window.location.hostname}/ingest",
});

function MyApp() {
  useEffect(() => { // use componentDidMount in case of React Class Component
    tracker.start();
  }, []);
  
  //...
}`


function InstallDocs({ site }) {  
  const _usageCode = usageCode.replace('PROJECT_KEY', site.projectKey)
  const _usageCodeSST = usageCodeSST.replace('PROJECT_KEY', site.projectKey)
  const [isSpa, setIsSpa] = useState(true)
  return (
    <div>
     </div>
  )
}

// export default InstallDocs

export default connect(state => ({
  site: state.getIn([ 'site', 'instance' ]),
}))(InstallDocs)
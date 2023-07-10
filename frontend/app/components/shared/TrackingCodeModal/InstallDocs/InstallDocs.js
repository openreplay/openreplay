import React from 'react'
import stl from './installDocs.module.css'
import cn from 'classnames'
import { CopyButton } from 'UI';
import Highlight from 'react-highlight'

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
  return (
    <div>
      <div className="mb-3">
        <div className="font-semibold mb-2">1. Installation</div>
        <div className={ '' }>
          {/* <CopyButton content={installationCommand} className={cn(stl.codeCopy, 'mt-2 mr-2')} /> */}
          <div className={ cn(stl.snippetWrapper, '') }>
            <CopyButton content={installationCommand} className={cn(stl.codeCopy, 'mt-2 mr-2')} />
            <Highlight className="cli">
              {installationCommand}
            </Highlight>
          </div>  
        </div>
      </div>
      <div>
        <div className="font-semibold mb-2">2. Usage</div>
        <div className={ '' }>
          <div className={ cn(stl.snippetWrapper, '') }>
            <CopyButton content={_usageCode} className={cn(stl.codeCopy, 'mt-2 mr-2')} />
            <Highlight className="cli">
              {_usageCode}
            </Highlight>
          </div>  
        </div>
      </div>
      <div className="mt-6">See <a href="https://docs.openreplay.com/en/sdk/" className="color-teal underline" target="_blank">Documentation</a> for the list of available options.</div>
    </div>
  )
}

export default InstallDocs
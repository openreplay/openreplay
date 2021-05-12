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
      <div className="mb-8">
        <div className="font-semibold mb-2 flex items-center">
          <CircleNumber text="1" />
          Install the npm package.
        </div>
        <div className={ cn(stl.snippetWrapper, 'ml-10 mr-8') }>
          <CopyButton content={installationCommand} className={cn(stl.codeCopy, 'mt-2 mr-2')} />
          <Highlight className="cli">
            {installationCommand}
          </Highlight>
        </div>
      </div>
      <div>
        <div className="font-semibold mb-2 flex items-center">
          <CircleNumber text="2" />
          Continue with one of the following options.          
        </div>

        <div className="flex items-center ml-10 cursor-pointer">
          <div className="mr-2" onClick={() => setIsSpa(!isSpa)}>Server-Side-Rendered (SSR)?</div>
          <Slider
            name="sessionsLive"
            onChange={ () => setIsSpa(!isSpa) }
            checked={ !isSpa }
            // className={stl.customSlider}
            style={{ lineHeight: '23px' }}
            // label="Server-Side-Rendered (SSR)?"
          />
        </div>
        
        <div className="flex ml-10 mt-4">
          <div className="w-full">
            {isSpa && (
              <div className="w-6/12">
                <div className="mb-2 text-sm">If your website is a <strong>Single Page Application (SPA)</strong> use the below code:</div>
                <div className={ cn(stl.snippetWrapper) }>
                  <CopyButton content={_usageCode} className={cn(stl.codeCopy, 'mt-2 mr-2')} />
                  <Highlight className="js">
                    {_usageCode}
                  </Highlight>
                </div>
              </div>
            )}

            {!isSpa && (
              <div className="w-6/12">
                <div className="mb-2 text-sm">Otherwise, if your web app is <strong>Server-Side-Rendered (SSR)</strong> (i.e. NextJS, NuxtJS) use this snippet:</div>
                <div className={ cn(stl.snippetWrapper) }>
                  <CopyButton content={_usageCodeSST} className={cn(stl.codeCopy, 'mt-2 mr-2')} />
                  <Highlight className="js">
                    {_usageCodeSST}
                  </Highlight>
                </div>
              </div>
            )}
          </div>         
        </div>
      </div>
      <div className="border-t pt-4 mt-8">See <a href="https://docs.openreplay.com/installation/javascript-sdk" className="color-teal underline" target="_blank">Documentation</a> for the list of available options.</div>
    </div>
  )
}

// export default InstallDocs

export default connect(state => ({
  site: state.getIn([ 'site', 'instance' ]),
}))(InstallDocs)
import React, { useState } from 'react';
import stl from './installDocs.module.css';
import cn from 'classnames';
import CircleNumber from '../../CircleNumber';
import { CopyButton, CodeBlock } from 'UI';
import { Toggler } from 'UI';

const installationCommand = 'npm i @openreplay/tracker';
const usageCode = `import Tracker from '@openreplay/tracker';

const tracker = new Tracker({
  projectKey: "PROJECT_KEY",
  ingestPoint: "https://${window.location.hostname}/ingest",
});
// .start() returns a promise
tracker.start().then(sessionData => ... ).catch(e => ... )`;
const usageCodeSST = `import Tracker from '@openreplay/tracker/cjs';

const tracker = new Tracker({
  projectKey: "PROJECT_KEY",
  ingestPoint: "https://${window.location.hostname}/ingest",
});

function MyApp() {
  useEffect(() => { // use componentDidMount in case of React Class Component
    // .start() returns a promise
    tracker.start().then(sessionData => ... ).catch(e => ... )
  }, []);
  
  //...
}`;

function InstallDocs({ site }) {
  const _usageCode = usageCode.replace('PROJECT_KEY', site.projectKey);
  const _usageCodeSST = usageCodeSST.replace('PROJECT_KEY', site.projectKey);
  const [isSpa, setIsSpa] = useState(true);
  return (
    <div>
      <div className="mb-6">
        <div className="font-semibold mb-2 flex items-center">
          <CircleNumber text="1" />
          Install the npm package.
        </div>
        <div className={cn(stl.snippetWrapper, 'ml-10')}>
          <div className="absolute mt-1 mr-2 right-0">
            <CopyButton content={installationCommand} />
          </div>
          <CodeBlock code={installationCommand} language={'bash'} />
        </div>
      </div>
      <div className={'mb-6'}>
        <div className="font-semibold mb-2 flex items-center">
          <CircleNumber text="2" />
          Continue with one of the following options.
        </div>

        <div className="flex items-center ml-10 cursor-pointer">
          <div className="mr-2" onClick={() => setIsSpa(!isSpa)}>
            Server-Side-Rendered (SSR)?
          </div>
          <Toggler
            checked={!isSpa}
            name="sessionsLive"
            onChange={() => setIsSpa(!isSpa)}
            // style={{ lineHeight: '23px' }}
          />
        </div>

        <div className="flex ml-10 mt-4">
          <div className="w-full">
            {isSpa && (
              <div>
                <div className="mb-2 text-sm">
                  If your website is a <strong>Single Page Application (SPA)</strong> use the below
                  code:
                </div>
                <div className={cn(stl.snippetWrapper)}>
                  <div className="absolute mt-1 mr-2 right-0">
                    <CopyButton content={_usageCode} />
                  </div>
                  <CodeBlock code={_usageCode} language={'js'} />
                </div>
              </div>
            )}

            {!isSpa && (
              <div>
                <div className="mb-2 text-sm">
                  Otherwise, if your web app is <strong>Server-Side-Rendered (SSR)</strong> (i.e.
                  NextJS, NuxtJS),{' '}
                  <a className={'text-main'} href={'https://docs.openreplay.com/en/using-or/next/'}>consider async imports</a>
                  or cjs version of the library:
                </div>
                <div className={cn(stl.snippetWrapper)}>
                  <div className="absolute mt-1 mr-2 right-0">
                    <CopyButton content={_usageCodeSST} />
                  </div>
                  <CodeBlock code={_usageCodeSST} language={'js'} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="font-semibold mb-2 flex items-center">
          <CircleNumber text="3" />
          Enable Assist (Optional)
        </div>
        <div className="flex ml-10 mt-4">
          <div className="w-full">
            <div>
              <div className="mb-2">
                Install the plugin via npm:
              </div>
              <div className={cn(stl.snippetWrapper)}>
                <div className="absolute mt-1 mr-2 right-0">
                  <CopyButton content={`npm i @openreplay/tracker-assist`} />
                </div>
                <CodeBlock code={`npm i @openreplay/tracker-assist`} language={'bash'} />
              </div>
            </div>
            <div>
              <div className={'mb-2'}>
                Then enable it with your tracker:
              </div>
              <div className={cn(stl.snippetWrapper)}>
                <div className="absolute mt-1 mr-2 right-0">
                  <CopyButton content={`tracker.use(trackerAssist(options));`} />
                </div>
                <CodeBlock code={`tracker.use(trackerAssist(options));`} language={'js'} />
              </div>
              <div className={'text-sm'}>Read more about available options <a
                className={'text-main'}
                href={'https://github.com/openreplay/openreplay/blob/main/tracker/tracker-assist/README.md'}>here</a>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstallDocs;
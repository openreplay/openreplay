import React, { useState } from 'react';
import cn from 'classnames';
import { CopyButton, CodeBlock } from 'UI';
import { Switch } from 'antd';
import CircleNumber from '../../CircleNumber';
import stl from './installDocs.module.css';

const installationCommand = 'npm i @openreplay/tracker';
const usageCode = `import Tracker from '@openreplay/tracker';

const tracker = new Tracker({
  projectKey: "PROJECT_KEY",
  ingestPoint: "https://${window.location.hostname}/ingest",
});
tracker.start()`;
const usageCodeSST = `import Tracker from '@openreplay/tracker/cjs';

const tracker = new Tracker({
  projectKey: "PROJECT_KEY",
  ingestPoint: "https://${window.location.hostname}/ingest",
});

function MyApp() {
  useEffect(() => { // use componentDidMount in case of React Class Component
    tracker.start()
  }, []);
  
  //...
}`;

function InstallDocs({ site }) {
  const _usageCode = usageCode.replace('PROJECT_KEY', site.projectKey);
  const _usageCodeSST = usageCodeSST.replace('PROJECT_KEY', site.projectKey);
  const [isSpa, setIsSpa] = useState(true);
  return (
    <div className="flex flex-col gap-4 mt-4">
      <div>
        <div className="font-medium mb-2 flex gap-2 items-center">
          <CircleNumber text="1" />
          <span>Install the npm package.</span>
        </div>
        <div className={cn(stl.snippetWrapper, 'ml-8')}>
          <div className="absolute mt-1 mr-2 right-0">
            <CopyButton content={installationCommand} />
          </div>
          <CodeBlock code={installationCommand} language="bash" />
        </div>
      </div>

      <div>
        <div className="font-medium mb-2 flex gap-2 items-center">
          <CircleNumber text="2" />
          <span>Continue with one of the following options.</span>
        </div>

        <div className="flex items-center ml-8 cursor-pointer">
          <div className="mr-2" onClick={() => setIsSpa(!isSpa)}>
            Server-Side-Rendered (SSR)?
          </div>
          <Switch
            checked={!isSpa}
            name="sessionsLive"
            onChange={() => setIsSpa(!isSpa)}
          />
        </div>

        <div className="flex ml-8">
          <div className="w-full">
            {isSpa && (
              <div>
                <div className="mb-2 text-sm">
                  If your website is a
                  {' '}
                  <strong>Single Page Application (SPA)</strong>
                  {' '}
                  use the below
                  code:
                </div>
                <div className={cn(stl.snippetWrapper)}>
                  <div className="absolute mt-1 mr-2 right-0">
                    <CopyButton content={_usageCode} />
                  </div>
                  <CodeBlock code={_usageCode} language="js" />
                </div>
              </div>
            )}

            {!isSpa && (
              <div>
                <div className="mb-2 text-sm">
                  Otherwise, if your web app is
                  {' '}
                  <strong>Server-Side-Rendered (SSR)</strong>
                  {' '}
                  (i.e.
                  NextJS, NuxtJS),
                  {' '}
                  <a className="text-main" href="https://docs.openreplay.com/en/using-or/next/">consider async imports</a>
                  or cjs version of the library:
                </div>
                <div className={cn(stl.snippetWrapper)}>
                  <div className="absolute mt-1 mr-2 right-0">
                    <CopyButton content={_usageCodeSST} />
                  </div>
                  <CodeBlock code={_usageCodeSST} language="js" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="font-medium mb-2 flex gap-2 items-center">
          <CircleNumber text="3" />
          <span>Enable Assist (Optional)</span>
        </div>
        <div className="flex ml-8 mt-4">
          <div className="w-full">
            <div>
              <div className="-mb-2">
                Install the plugin via npm:
              </div>
              <div className={cn(stl.snippetWrapper)}>
                <div className="absolute mt-1 mr-2 right-0">
                  <CopyButton content="npm i @openreplay/tracker-assist" />
                </div>
                <CodeBlock code="npm i @openreplay/tracker-assist" language="bash" />
              </div>
            </div>
            <div>
              <div className="-mb-2">
                Then enable it with your tracker:
              </div>
              <div className={cn(stl.snippetWrapper)}>
                <div className="absolute mt-1 mr-2 right-0">
                  <CopyButton content="tracker.use(trackerAssist(options));" />
                </div>
                <CodeBlock code="tracker.use(trackerAssist(options));" language="js" />
              </div>
              <div className="text-sm">
                Read more about available options
                <a
                  className="text-main"
                  href="https://github.com/openreplay/openreplay/blob/main/tracker/tracker-assist/README.md"
                >
                  here
                </a>
                .
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstallDocs;

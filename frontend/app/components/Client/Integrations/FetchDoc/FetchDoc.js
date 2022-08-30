import React from 'react';
import Highlight from 'react-highlight';
import ToggleContent from 'Shared/ToggleContent';
import DocLink from 'Shared/DocLink/DocLink';
import { connect } from 'react-redux';

const FetchDoc = (props) => {
    const { projectKey } = props;
    return (
        <div className="bg-white h-screen overflow-y-auto" style={{ width: '500px' }}>
            <h3 className="p-5 text-2xl">Fetch</h3>
            <div className="p-5">
                <div>
                    This plugin allows you to capture fetch payloads and inspect them later on while replaying session recordings. This is very useful
                    for understanding and fixing issues.
                </div>

                <div className="font-bold my-2">Installation</div>
                <Highlight className="js">{`npm i @openreplay/tracker-fetch --save`}</Highlight>

                <div className="font-bold my-2">Usage</div>
                <p>Use the provided fetch method from the plugin instead of the one built-in.</p>
                <div className="py-3" />

                <div className="font-bold my-2">Usage</div>
                <ToggleContent
                    label="Server-Side-Rendered (SSR)?"
                    first={
                        <Highlight className="js">
                            {`import OpenReplay from '@openreplay/tracker';
import trackerFetch from '@openreplay/tracker-fetch';
//...
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
tracker.start();
//...
export const fetch = tracker.use(trackerFetch(<options>)); // check list of available options below
//...
fetch('https://api.openreplay.com/').then(response => console.log(response.json()));`}
                        </Highlight>
                    }
                    second={
                        <Highlight className="js">
                            {`import OpenReplay from '@openreplay/tracker/cjs';
import trackerFetch from '@openreplay/tracker-fetch/cjs';
//...
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
//...
function SomeFunctionalComponent() {
  useEffect(() => { // or componentDidMount in case of Class approach
    tracker.start();
  }, [])
//...
export const fetch = tracker.use(trackerFetch(<options>)); // check list of available options below
//...
fetch('https://api.openreplay.com/').then(response => console.log(response.json()));
}`}
                        </Highlight>
                    }
                />

                <DocLink className="mt-4" label="Integrate Fetch" url="https://docs.openreplay.com/plugins/fetch" />
            </div>
        </div>
    );
};

FetchDoc.displayName = 'FetchDoc';

export default connect((state) => ({ projectKey: state.getIn(['site', 'instance', 'projectKey'])}) )(FetchDoc)

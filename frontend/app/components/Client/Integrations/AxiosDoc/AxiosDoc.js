import React from 'react';
import Highlight from 'react-highlight';
import ToggleContent from 'Shared/ToggleContent';
import DocLink from 'Shared/DocLink/DocLink';
import { connect } from 'react-redux';

const AxiosDoc = (props) => {
    const { projectKey } = props;
    return (
        <div className="bg-white h-screen overflow-y-auto" style={{ width: '500px' }}>
            <h3 className="p-5 text-2xl">Axios</h3>
            <div className="p-5">
                <div>
                    This plugin allows you to capture axios requests and inspect them later on while replaying session recordings. This is very useful
                    for understanding and fixing issues.
                </div>

                <div className="font-bold my-2">Installation</div>
                <Highlight className="js">{`npm i @openreplay/tracker-axios`}</Highlight>

                <div className="font-bold my-2">Usage</div>
                <p>
                    Initialize the @openreplay/tracker package as usual then load the axios plugin. Note that OpenReplay axios plugin requires
                    axios@^0.21.2 as a peer dependency.
                </p>
                <div className="py-3" />

                <div className="font-bold my-2">Usage</div>
                <ToggleContent
                    label="Server-Side-Rendered (SSR)?"
                    first={
                        <Highlight className="js">
                            {`import OpenReplay from '@openreplay/tracker';
import trackerAxios from '@openreplay/tracker-axios';
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
tracker.use(trackerAxios(options)); // check list of available options below
tracker.start();`}
                        </Highlight>
                    }
                    second={
                        <Highlight className="js">
                            {`import OpenReplay from '@openreplay/tracker/cjs';
import trackerAxios from '@openreplay/tracker-axios/cjs';
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
tracker.use(trackerAxios(options)); // check list of available options below
//...
function MyApp() {
  useEffect(() => { // use componentDidMount in case of React Class Component
    tracker.start();
  }, [])
//...
}`}
                        </Highlight>
                    }
                />

                <DocLink className="mt-4" label="Integrate Fetch" url="https://docs.openreplay.com/plugins/axios" />
            </div>
        </div>
    );
};

AxiosDoc.displayName = 'AxiosDoc';

export default connect((state) => ({ projectKey: state.getIn(['site', 'instance', 'projectKey'])}) )(AxiosDoc)

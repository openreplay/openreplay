import React from 'react';
import Highlight from 'react-highlight';
import ToggleContent from '../../../shared/ToggleContent';
import DocLink from 'Shared/DocLink/DocLink';
import { connect } from 'react-redux';

const ReduxDoc = (props) => {
    const { projectKey } = props;
    return (
        <div className="bg-white h-screen overflow-y-auto" style={{ width: '500px' }}>
            <h3 className="p-5 text-2xl">Redux</h3>

            <div className="p-5">
                <div>
                    This plugin allows you to capture Redux actions/state and inspect them later on while replaying session recordings. This is very
                    useful for understanding and fixing issues.
                </div>

                <div className="font-bold my-2 text-lg">Installation</div>
                <Highlight className="js">{`npm i @openreplay/tracker-redux --save`}</Highlight>

                <div className="font-bold my-2 text-lg">Usage</div>
                <p>Initialize the tracker then put the generated middleware into your Redux chain.</p>
                <div className="py-3" />
                <ToggleContent
                    label="Server-Side-Rendered (SSR)?"
                    first={
                        <Highlight className="js">
                            {`import { applyMiddleware, createStore } from 'redux';
import OpenReplay from '@openreplay/tracker';
import trackerRedux from '@openreplay/tracker-redux';
//...
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
tracker.start();
//...
const store = createStore(
  reducer,
  applyMiddleware(tracker.use(trackerRedux(<options>))) // check list of available options below
);`}
                        </Highlight>
                    }
                    second={
                        <Highlight className="js">
                            {`import { applyMiddleware, createStore } from 'redux';
import OpenReplay from '@openreplay/tracker/cjs';
import trackerRedux from '@openreplay/tracker-redux/cjs';
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
const store = createStore(
    reducer,
    applyMiddleware(tracker.use(trackerRedux(<options>))) // check list of available options below
  );
}`}
                        </Highlight>
                    }
                />

                <DocLink className="mt-4" label="Integrate Redux" url="https://docs.openreplay.com/plugins/redux" />
            </div>
        </div>
    );
};

ReduxDoc.displayName = 'ReduxDoc';

export default connect((state) => ({ projectKey: state.getIn(['site', 'instance', 'projectKey'])}) )(ReduxDoc)

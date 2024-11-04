import React from 'react';
import { CodeBlock } from 'UI'
import ToggleContent from '../../../shared/ToggleContent';
import DocLink from 'Shared/DocLink/DocLink';
import { connect } from 'react-redux';

const ReduxDoc = (props) => {
    const { projectKey } = props;

    const usage = `import { applyMiddleware, createStore } from 'redux';
import OpenReplay from '@openreplay/tracker';
import trackerRedux from '@openreplay/tracker-redux';
//...
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
// .start() returns a promise
tracker.start().then(sessionData => ... ).catch(e => ... )
//...
const store = createStore(
  reducer,
  applyMiddleware(tracker.use(trackerRedux(<options>))) // check list of available options below
);`
  const usageCjs = `import { applyMiddleware, createStore } from 'redux';
import OpenReplay from '@openreplay/tracker/cjs';
import trackerRedux from '@openreplay/tracker-redux/cjs';
//...
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
//...
function SomeFunctionalComponent() {
  useEffect(() => { // or componentDidMount in case of Class approach
    // .start() returns a promise
    tracker.start().then(sessionData => ... ).catch(e => ... )
  }, [])
//...
const store = createStore(
    reducer,
    applyMiddleware(tracker.use(trackerRedux(<options>))) // check list of available options below
  );
}`
    return (
        <div className="bg-white h-screen overflow-y-auto" style={{ width: '500px' }}>
            <h3 className="p-5 text-2xl">Redux</h3>

            <div className="p-5">
                <div>
                    This plugin allows you to capture Redux actions/state and inspect them later on while replaying session recordings. This is very
                    useful for understanding and fixing issues.
                </div>

                <div className="font-bold my-2 text-lg">Installation</div>
                <CodeBlock code={'npm i @openreplay/tracker-redux --save'} language={'bash'} />

                <div className="font-bold my-2 text-lg">Usage</div>
                <p>Initialize the tracker then put the generated middleware into your Redux chain.</p>
                <div className="py-3" />
                <ToggleContent
                    label="Server-Side-Rendered (SSR)?"
                    first={
                        <CodeBlock language={'js'} code={usage} />
                    }
                    second={
                        <CodeBlock language={'jsx'} code={usageCjs} />
                    }
                />

                <DocLink className="mt-4" label="Integrate Redux" url="https://docs.openreplay.com/plugins/redux" />
            </div>
        </div>
    );
};

ReduxDoc.displayName = 'ReduxDoc';

export default connect((state) => {
  const siteId = state.getIn(['integrations', 'siteId']);
  const sites = state.getIn(['site', 'list']);
  return {
    projectKey: sites.find((site) => site.get('id') === siteId).get('projectKey'),
  };
})(ReduxDoc);

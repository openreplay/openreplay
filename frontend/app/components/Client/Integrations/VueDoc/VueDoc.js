import React from 'react';
import Highlight from 'react-highlight';
import ToggleContent from '../../../shared/ToggleContent';
import DocLink from 'Shared/DocLink/DocLink';
import { connect } from 'react-redux';

const VueDoc = (props) => {
    const { projectKey } = props;
    return (
        <div className="bg-white h-screen overflow-y-auto" style={{ width: '500px' }}>
            <h3 className="p-5 text-2xl">VueX</h3>
            <div className="p-5">
                <div>
                    This plugin allows you to capture VueX mutations/state and inspect them later on while replaying session recordings. This is very
                    useful for understanding and fixing issues.
                </div>

                <div className="font-bold my-2 text-lg">Installation</div>
                <Highlight className="js">{`npm i @openreplay/tracker-vuex --save`}</Highlight>

                <div className="font-bold my-2 text-lg">Usage</div>
                <p>
                    Initialize the @openreplay/tracker package as usual and load the plugin into it. Then put the generated plugin into your plugins
                    field of your store.
                </p>
                <div className="py-3" />

                <ToggleContent
                    label="Server-Side-Rendered (SSR)?"
                    first={
                        <Highlight className="js">
                            {`import Vuex from 'vuex'
import OpenReplay from '@openreplay/tracker';
import trackerVuex from '@openreplay/tracker-vuex';
//...
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
tracker.start();
//...
const store = new Vuex.Store({
  //...
  plugins: [tracker.use(trackerVuex(<options>))] // check list of available options below
});`}
                        </Highlight>
                    }
                    second={
                        <Highlight className="js">
                            {`import Vuex from 'vuex'
import OpenReplay from '@openreplay/tracker/cjs';
import trackerVuex from '@openreplay/tracker-vuex/cjs';
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
const store = new Vuex.Store({
    //...
    plugins: [tracker.use(trackerVuex(<options>))] // check list of available options below
  });
}`}
                        </Highlight>
                    }
                />

                <DocLink className="mt-4" label="Integrate Vuex" url="https://docs.openreplay.com/plugins/vuex" />
            </div>
        </div>
    );
};

VueDoc.displayName = 'VueDoc';

export default connect((state) => ({ projectKey: state.getIn(['site', 'instance', 'projectKey'])}) )(VueDoc)

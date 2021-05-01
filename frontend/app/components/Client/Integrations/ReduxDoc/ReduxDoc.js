import Highlight from 'react-highlight'
import ToggleContent from '../../../shared/ToggleContent';

const ReduxDoc = (props) => {
  return (
    <div className="p-4">
      <div>This plugin allows you to capture Redux actions/state and inspect them later on while replaying session recordings. This is very useful for understanding and fixing issues.</div>
      
      <div className="font-bold my-2 text-lg">Installation</div>
      <Highlight className="js">
        {`npm i @openreplay/tracker-redux --save`}
      </Highlight>
      

      <div className="font-bold my-2 text-lg">Usage</div>
      <p>Initialize the tracker then put the generated middleware into your Redux chain.</p>
      <div className="py-3" />
      <ToggleContent
        label="Is SSR?"
        first={
          <Highlight className="js">
        {`import { applyMiddleware, createStore } from 'redux';
import OpenReplay from '@openreplay/tracker';
import trackerRedux from '@openreplay/tracker-redux';
//...
const tracker = new OpenReplay({
  projectKey: PROJECT_KEY
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
  projectKey: PROJECT_KEY
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

      <div className="mt-6">See <a href="https://docs.openreplay.com/api" className="color-teal underline" target="_blank">API</a> for more options.</div>
    </div>
  )
};

ReduxDoc.displayName = "ReduxDoc";

export default ReduxDoc;

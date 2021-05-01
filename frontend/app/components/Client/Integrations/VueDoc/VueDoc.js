import Highlight from 'react-highlight'
import ToggleContent from '../../../shared/ToggleContent';

const VueDoc = (props) => {
  return (
    <div className="p-4">
      <div>This plugin allows you to capture VueX mutations/state and inspect them later on while replaying session recordings. This is very useful for understanding and fixing issues.</div>
      
      <div className="font-bold my-2 text-lg">Installation</div>
      <Highlight className="js">
        {`npm i @openreplay/tracker-vuex --save`}
      </Highlight>
      
      <div className="font-bold my-2 text-lg">Usage</div>
      <p>Initialize the @openreplay/tracker package as usual and load the plugin into it. Then put the generated plugin into your plugins field of your store.</p>
      <div className="py-3" />

      
      <ToggleContent
        label="Is SSR?"
        first={
          <Highlight className="js">
        {`import Vuex from 'vuex'
import OpenReplay from '@openreplay/tracker';
import trackerVuex from '@openreplay/tracker-vuex';
//...
const tracker = new OpenReplay({
  projectKey: PROJECT_KEY
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
  projectKey: PROJECT_KEY
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

      <div className="mt-6">See <a href="https://docs.openreplay.com/api" className="color-teal underline" target="_blank">API</a> for more options.</div>
    </div>
  )
};

VueDoc.displayName = "VueDoc";

export default VueDoc;

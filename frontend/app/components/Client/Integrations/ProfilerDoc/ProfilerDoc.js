import Highlight from 'react-highlight'
import ToggleContent from 'Shared/ToggleContent'
import DocLink from 'Shared/DocLink/DocLink';

const ProfilerDoc = (props) => {
  return (
    <div className="p-4">
      <div>The profiler plugin allows you to measure your JS functions' performance and capture both arguments and result for each function call.</div>
      
      <div className="font-bold my-2">Installation</div>
      <Highlight className="js">
        {`npm i @openreplay/tracker-profiler --save`}
      </Highlight>
      
      <div className="font-bold my-2">Usage</div>
      <p>Initialize the tracker and load the plugin into it. Then decorate any function inside your code with the generated function.</p>
      <div className="py-3" />

      <div className="font-bold my-2">Usage</div>
      <ToggleContent
        label="Is SSR?"
        first={
          <Highlight className="js">
        {`import OpenReplay from '@openreplay/tracker';
import trackerProfiler from '@openreplay/tracker-profiler';
//...
const tracker = new OpenReplay({
  projectKey: PROJECT_KEY
});
tracker.start();
//...
export const profiler = tracker.use(trackerProfiler());
//...
const fn = profiler('call_name')(() => {
//...
}, thisArg); // thisArg is optional`}
      </Highlight>
        }
        second={
          <Highlight className="js">
        {`import OpenReplay from '@openreplay/tracker/cjs';
import trackerProfiler from '@openreplay/tracker-profiler/cjs';
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
export const profiler = tracker.use(trackerProfiler());
//...
const fn = profiler('call_name')(() => {
  //...
  }, thisArg); // thisArg is optional
}`}
      </Highlight>
        }
      />

      <DocLink className="mt-4" label="Integrate Profiler" url="https://docs.openreplay.com/plugins/profiler" />
    </div>
  )
};

ProfilerDoc.displayName = "ProfilerDoc";

export default ProfilerDoc;

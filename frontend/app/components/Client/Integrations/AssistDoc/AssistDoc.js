import Highlight from 'react-highlight'
import ToggleContent from 'Shared/ToggleContent'
import DocLink from 'Shared/DocLink/DocLink';

const AssistDoc = (props) => {
  const { projectKey } = props;
  return (
    <div className="p-4">
      <div>OpenReplay Assist allows you to support your users by seeing their live screen and instantly hopping on call (WebRTC) with them without requiring any 3rd-party screen sharing software.</div>
      
      <div className="font-bold my-2">Installation</div>
      <Highlight className="js">
        {`npm i @openreplay/tracker-assist`}
      </Highlight>
      
      <div className="font-bold my-2">Usage</div>
      <p>Initialize the tracker then load the @openreplay/tracker-assist plugin.</p>
      <div className="py-3" />

      <div className="font-bold my-2">Usage</div>
      <ToggleContent
        label="Server-Side-Rendered (SSR)?"
        first={
          <Highlight className="js">
        {`import Tracker from '@openreplay/tracker';
import trackerAssist from '@openreplay/tracker-assist';
const tracker = new Tracker({
  projectKey: '${projectKey}',
});
tracker.start();
tracker.use(trackerAssist(options)); // check the list of available options below`}
      </Highlight>
        }
        second={
          <Highlight className="js">
        {`import OpenReplay from '@openreplay/tracker/cjs';
import trackerFetch from '@openreplay/tracker-assist/cjs';
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
const trackerAssist = tracker.use(trackerAssist(options)); // check the list of available options below
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

      <div className="font-bold my-2">Options</div>
      <Highlight className="js">
        {`trackerAssist({
  confirmText: string;
})`}
      </Highlight>

      <DocLink className="mt-4" label="Install Assist" url="https://docs.openreplay.com/installation/assist" />
    </div>
  )
};

AssistDoc.displayName = "AssistDoc";

export default AssistDoc;

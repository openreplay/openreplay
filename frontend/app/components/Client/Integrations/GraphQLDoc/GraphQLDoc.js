import Highlight from 'react-highlight'
import ToggleContent from '../../../shared/ToggleContent';

const GraphQLDoc = (props) => {
  return (
    <div className="p-4">
      <p>This plugin allows you to capture GraphQL requests and inspect them later on while replaying session recordings. This is very useful for understanding and fixing issues.</p>
      <p>GraphQL plugin is compatible with Apollo and Relay implementations.</p>      
      
      <div className="font-bold my-2">Installation</div>
      <Highlight className="js">
        {`npm i @openreplay/tracker-graphql --save`}
      </Highlight>      
    
      <div className="font-bold my-2">Usage</div>
      <p>The plugin call will return the function, which receives four variables operationKind, operationName, variables and result. It returns result without changes.</p>
      
      <div className="py-3" />

      <ToggleContent
        label="Is SSR?"
        first={
          <Highlight className="js">
        {`import OpenReplay from '@openreplay/tracker';
import trackerGraphQL from '@openreplay/tracker-graphql';
//...
const tracker = new OpenReplay({
  projectKey: PROJECT_KEY,
});
tracker.start();
//...
export const recordGraphQL = tracker.use(trackerGraphQL());`}
      </Highlight>
        }
        second={
          <Highlight className="js">
        {`import OpenReplay from '@openreplay/tracker/cjs';
import trackerGraphQL from '@openreplay/tracker-graphql/cjs';
//...
const tracker = new OpenReplay({
  projectKey: PROJECT_KEY
});
//...
function SomeFunctionalComponent() {
  useEffect(() => { // or componentDidMount in case of Class approach
    tracker.start();
  }, [])
}
//...
export const recordGraphQL = tracker.use(trackerGraphQL());`}
      </Highlight>
        }
      />

      <div className="mt-6">See <a href="https://docs.openreplay.com/api" className="color-teal underline" target="_blank">API</a> for more options.</div>
    </div>
  )
};

GraphQLDoc.displayName = "GraphQLDoc";

export default GraphQLDoc;

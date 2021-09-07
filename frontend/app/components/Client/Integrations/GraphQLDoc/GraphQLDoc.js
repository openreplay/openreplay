import Highlight from 'react-highlight'
import DocLink from 'Shared/DocLink/DocLink';
import ToggleContent from 'Shared/ToggleContent';

const GraphQLDoc = (props) => {
  const { projectKey } = props;
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
        label="Server-Side-Rendered (SSR)?"
        first={
          <Highlight className="js">
        {`import OpenReplay from '@openreplay/tracker';
import trackerGraphQL from '@openreplay/tracker-graphql';
//...
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
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
  projectKey: '${projectKey}'
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

      <DocLink className="mt-4" label="Integrate GraphQL" url="https://docs.openreplay.com/plugins/graphql" />
    </div>
  )
};

GraphQLDoc.displayName = "GraphQLDoc";

export default GraphQLDoc;

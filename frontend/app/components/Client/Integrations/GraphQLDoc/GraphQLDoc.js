import React from 'react';
import { CodeBlock } from "UI";
import DocLink from 'Shared/DocLink/DocLink';
import ToggleContent from 'Shared/ToggleContent';
import { connect } from 'react-redux';

const GraphQLDoc = (props) => {
    const { projectKey } = props;
    const usage = `import OpenReplay from '@openreplay/tracker';
import trackerGraphQL from '@openreplay/tracker-graphql';
//...
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
// .start() returns a promise
tracker.start().then(sessionData => ... ).catch(e => ... )
//...
export const recordGraphQL = tracker.use(trackerGraphQL());`
    const usageCjs = `import OpenReplay from '@openreplay/tracker/cjs';
import trackerGraphQL from '@openreplay/tracker-graphql/cjs';
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
}
//...
export const recordGraphQL = tracker.use(trackerGraphQL());`
    return (
        <div className="bg-white h-screen overflow-y-auto" style={{ width: '500px' }}>
            <h3 className="p-5 text-2xl">GraphQL</h3>
            <div className="p-5">
                <p>
                    This plugin allows you to capture GraphQL requests and inspect them later on while replaying session recordings. This is very
                    useful for understanding and fixing issues.
                </p>
                <p>GraphQL plugin is compatible with Apollo and Relay implementations.</p>

                <div className="font-bold my-2">Installation</div>
                <CodeBlock code={'npm i @openreplay/tracker-graphql --save'} language={'bash'}  />

                <div className="font-bold my-2">Usage</div>
                <p>
                    The plugin call will return the function, which receives four variables operationKind, operationName, variables and result. It
                    returns result without changes.
                </p>

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

                <DocLink className="mt-4" label="Integrate GraphQL" url="https://docs.openreplay.com/plugins/graphql" />
            </div>
        </div>
    );
};

GraphQLDoc.displayName = 'GraphQLDoc';

export default connect((state) => {
    const siteId = state.getIn(['integrations', 'siteId']);
    const sites = state.getIn(['site', 'list']);
    return {
      projectKey: sites.find((site) => site.get('id') === siteId).get('projectKey'),
    };
})(GraphQLDoc);

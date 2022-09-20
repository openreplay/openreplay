import React from 'react';
import Highlight from 'react-highlight';
import ToggleContent from '../../../shared/ToggleContent';
import DocLink from 'Shared/DocLink/DocLink';
import { connect } from 'react-redux';

const ZustandDoc = (props) => {
    const { projectKey } = props;
    return (
        <div className="bg-white h-screen overflow-y-auto" style={{ width: '500px' }}>
            <h3 className="p-5 text-2xl">Zustand</h3>
            <div className="p-5">
                <div>
                    This plugin allows you to capture Zustand mutations/state and inspect them later on while replaying session recordings. This is very
                    useful for understanding and fixing issues.
                </div>

                <div className="font-bold my-2 text-lg">Installation</div>
                <Highlight className="js">{`npm i @openreplay/tracker-zustand --save`}</Highlight>

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
                            {`import create from "zustand";
import Tracker from '@openreplay/tracker';
import trackerZustand from '@openreplay/tracker-zustand';


const tracker = new Tracker({
  projectKey: ${projectKey},
});

const zustandPlugin = tracker.use(trackerZustand())
// store name, optional
// randomly generated if undefined
const bearStoreLogger = zustandPlugin('bear_store')


const useBearStore = create(
  bearStoreLogger((set: any) => ({
    bears: 0,
    increasePopulation: () => set((state: any) => ({ bears: state.bears + 1 })),
    removeAllBears: () => set({ bears: 0 }),
  }))
)`}
                        </Highlight>
                    }
                    second={
                        <Highlight className="js">
                            {`import create from "zustand";
import Tracker from '@openreplay/tracker/cjs';
import trackerZustand from '@openreplay/tracker-zustand/cjs';


const tracker = new Tracker({
  projectKey: ${projectKey},
});

const zustandPlugin = tracker.use(trackerZustand())
// store name, optional
// randomly generated if undefined
const bearStoreLogger = zustandPlugin('bear_store')


const useBearStore = create(
  bearStoreLogger((set: any) => ({
    bears: 0,
    increasePopulation: () => set((state: any) => ({ bears: state.bears + 1 })),
    removeAllBears: () => set({ bears: 0 }),
  }))
)`}
                        </Highlight>
                    }
                />

                <DocLink className="mt-4" label="Integrate Vuex" url="https://docs.openreplay.com/plugins/zustand" />
            </div>
        </div>
    );
};

ZustandDoc.displayName = 'ZustandDoc';

export default connect((state) => ({ projectKey: state.getIn(['site', 'instance', 'projectKey'])}) )(ZustandDoc)

import React from 'react';
import stl from './installDocs.module.css';
import cn from 'classnames';
import Highlight from 'react-highlight';
import CircleNumber from '../../CircleNumber';
import {CopyButton} from 'UI';

export const installationCommand = `// Add it in your root build.gradle at the end of repositories:
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
        maven { url 'https://jitpack.io' }
    }
}

// Add the dependency in your app build.gradle file:
dependencies {
    implementation("com.github.openreplay:android:Tag")
}
`;

export const usageCode = `// MainActivity.kt
import com.openreplay.tracker.OpenReplay

//...
class MainActivity : TrackingActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
    // not required if you're using our SaaS version
    OpenReplay.serverURL = "https://your.instance.com/ingest"
    // check out our SDK docs to see available options
    OpenReplay.start(
        applicationContext,
        "projectkey",
        OpenReplay.Options.defaults(),
        onStarted = {
            println("OpenReplay Started")
        })

        // ...
    }
}`;
const configuration = `let crashs: Bool
let analytics: Bool
let performances: Bool
let logs: Bool
let screen: Bool
let wifiOnly: Bool`;

const touches = `class MainActivity : ComponentActivity() {
    // ...
    OpenReplay.setupGestureDetector(this)
}`

const sensitive = `import com.openreplay.tracker.OpenReplay

OpenReplay.addIgnoredView(view)
`

const inputs = `import com.opnereplay.tracker.OpenReplay

val passwordEditText = binding.password
passwordEditText.trackTextInput(label = "password", masked = true)`

function AndroidInstallDocs({site}: any) {
    const _usageCode = usageCode.replace('PROJECT_KEY', site.projectKey);

    return (
        <div>
            <div className="mb-4">
                <div className="font-semibold mb-2 flex items-center">
                    <CircleNumber text="1"/>
                    Install the SDK
                </div>
                <div className={cn(stl.snippetWrapper, 'ml-10')}>
                    <div className="absolute mt-1 mr-2 right-0">
                        <CopyButton content={installationCommand}/>
                    </div>
                    <Highlight className="cli">{installationCommand}</Highlight>
                </div>
            </div>

            <div className="font-semibold mb-2 flex items-center">
                <CircleNumber text="2"/>
                Add to your app
            </div>
            <div className="flex ml-10 mt-4">
                <div className="w-full">
                    <div className={cn(stl.snippetWrapper)}>
                        <div className="absolute mt-1 mr-2 right-0">
                            <CopyButton content={_usageCode}/>
                        </div>
                        <Highlight className="swift">{_usageCode}</Highlight>
                    </div>
                </div>
            </div>

            <div className="font-semibold mb-2 mt-4 flex items-center">
                <CircleNumber text="3"/>
                Configuration
            </div>
            <div className="flex ml-10 mt-4">
                <div className="w-full">
                    <div className={cn(stl.snippetWrapper)}>
                        <Highlight className="swift">{configuration}</Highlight>
                        <div className={"mt-2"}>By default, all options equals <code
                            className={'p-1 text-red rounded bg-gray-lightest'}>true</code></div>
                    </div>
                </div>
            </div>

            <div className="font-semibold mb-2 mt-4 flex items-center">
                <CircleNumber text="4"/>
                Set up touch events listener
            </div>
            <div className="flex ml-10 mt-4">
                <div className="w-full">
                    <div className={cn(stl.snippetWrapper)}>
                        <div className="absolute mt-1 mr-2 right-0">
                            <CopyButton content={touches}/>
                        </div>
                        <Highlight className="swift">{touches}</Highlight>
                    </div>
                </div>
            </div>

            <div className="font-semibold mb-2 mt-4 flex items-center">
                <CircleNumber text="5"/>
                Hide sensitive views
            </div>
            <div className="flex ml-10 mt-4">
                <div className="w-full">
                    <div className={cn(stl.snippetWrapper)}>
                        <div className="absolute mt-1 mr-2 right-0">
                            <CopyButton content={sensitive}/>
                        </div>
                        <Highlight className="swift">{sensitive}</Highlight>
                    </div>
                </div>
            </div>

            <div className="font-semibold mb-2 mt-4 flex items-center">
                <CircleNumber text="6"/>
                Track inputs
            </div>
            <div className="flex ml-10 mt-4">
                <div className="w-full">
                    <div className={cn(stl.snippetWrapper)}>
                        <div className="absolute mt-1 mr-2 right-0">
                            <CopyButton content={inputs}/>
                        </div>
                        <Highlight className="swift">{inputs}</Highlight>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AndroidInstallDocs

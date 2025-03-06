import cn from 'classnames';
import React from 'react';

import { CodeBlock, CopyButton } from 'UI';

import CircleNumber from '../../CircleNumber';
import stl from './installDocs.module.css';
import { useTranslation } from 'react-i18next';

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
    OpenReplay.serverURL = "INGEST_POINT"
    // check out our SDK docs to see available options
    OpenReplay.start(
        applicationContext,
        "PROJECT_KEY",
        OpenReplay.Options.defaults(),
        onStarted = {
            println("OpenReplay Started")
        })

        // ...
    }
}`;
const configuration = `let crashes: Bool
let analytics: Bool
let performances: Bool
let logs: Bool
let screen: Bool
let wifiOnly: Bool`;

const touches = `class MainActivity : ComponentActivity() {
    // ...
    OpenReplay.setupGestureDetector(this)
}`;

const sensitive = `import com.openreplay.tracker.OpenReplay

OpenReplay.addIgnoredView(view)
`;

const inputs = `import com.openreplay.tracker.OpenReplay

val passwordEditText = binding.password
passwordEditText.trackTextInput(label = "password", masked = true)`;

function AndroidInstallDocs({ site, ingestPoint }: any) {
  const { t } = useTranslation();
  const _usageCode = usageCode
    .replace('PROJECT_KEY', site.projectKey)
    .replace('INGEST_POINT', ingestPoint);

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div>
        <div className="font-medium flex items-center gap-2">
          <CircleNumber text="1" />
          <span>{t('Install the SDK')}</span>
        </div>
        <div className={cn(stl.snippetWrapper, 'ml-8')}>
          <div className="absolute mt-1 mr-2 right-0">
            <CopyButton content={installationCommand} />
          </div>
          <CodeBlock code={installationCommand} language="bash" />
        </div>
      </div>

      <div>
        <div className="font-medium flex gap-2 items-center">
          <CircleNumber text="2" />
          <span>{t('Add to your app')}</span>
        </div>
        <div className="flex ml-8 mt-4">
          <div className="w-full">
            <div className={cn(stl.snippetWrapper)}>
              <div className="absolute mt-1 mr-2 right-0">
                <CopyButton content={_usageCode} />
              </div>
              <CodeBlock language="kt" code={_usageCode} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="font-medium flex gap-2 items-center">
          <CircleNumber text="3" />
          <span>{t('Configuration')}</span>
        </div>
        <div className="flex ml-8 mt-4">
          <div className="w-full">
            <div className={cn(stl.snippetWrapper)}>
              <CodeBlock code={configuration} language="kt" />
              <div className="mt-2">
                {t('By default, all options equals')}&nbsp;
                <code className="p-1 text-red rounded bg-gray-lightest">
                  {t('true')}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="font-medium flex gap-2 items-center">
          <CircleNumber text="4" />
          <span>&nbsp;{t('Set up touch events listener')}</span>
        </div>
        <div className="flex ml-8 mt-4">
          <div className="w-full">
            <div className={cn(stl.snippetWrapper)}>
              <div className="absolute mt-1 mr-2 right-0">
                <CopyButton content={touches} />
              </div>
              <CodeBlock code={touches} language="kt" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="font-medium flex gap-2 items-center">
          <CircleNumber text="5" />
          <span>{t('Hide sensitive views')}</span>
        </div>
        <div className="flex ml-8 mt-4">
          <div className="w-full">
            <div className={cn(stl.snippetWrapper)}>
              <div className="absolute mt-1 mr-2 right-0">
                <CopyButton content={sensitive} />
              </div>
              <CodeBlock code={sensitive} language="kt" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="font-medium flex gap-2 items-center">
          <CircleNumber text="6" />
          <span>{t('Track inputs')}</span>
        </div>
        <div className="flex ml-8 mt-4">
          <div className="w-full">
            <div className={cn(stl.snippetWrapper)}>
              <div className="absolute mt-1 mr-2 right-0">
                <CopyButton content={inputs} />
              </div>
              <CodeBlock code={inputs} language="kt" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AndroidInstallDocs;

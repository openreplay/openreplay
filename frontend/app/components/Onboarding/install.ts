import { trackerUrl } from 'Shared/CodeSnippet/url';

import ENV from '../../../env';

export type Platform = 'web' | 'ios' | 'android';
export type InstallMethod = 'npm' | 'script';
/** Project GDPR values; the tracker takes their index here. */
export type InputMode = 'plain' | 'hidden' | 'obscured';

export const INPUT_MODES: { value: InputMode; label: string; code: number }[] =
  [
    { value: 'plain', label: 'Record all inputs', code: 0 },
    { value: 'hidden', label: 'Obscure all inputs', code: 1 },
    { value: 'obscured', label: 'Ignore all inputs', code: 2 },
  ];

export const PLATFORMS: { key: Platform; label: string; language: string }[] = [
  { key: 'web', label: 'Web', language: 'JavaScript' },
  { key: 'ios', label: 'iOS', language: 'Swift' },
  { key: 'android', label: 'Android', language: 'Kotlin' },
];

export const DOCS = {
  web: 'https://docs.openreplay.com/en/sdk/using-or/',
  ios: 'https://docs.openreplay.com/en/ios-sdk/init/',
  android: 'https://docs.openreplay.com/en/android-sdk/init/',
  sdk: 'https://docs.openreplay.com/en/sdk/',
  options:
    'https://docs.openreplay.com/en/sdk/constructor/#initialization-options',
  ssr: 'https://docs.openreplay.com/en/sdk/using-or/next/',
  assist:
    'https://github.com/openreplay/openreplay/blob/main/tracker/tracker-assist/README.md',
  gtm: 'https://docs.openreplay.com/integrations/google-tag-manager',
  identify: (p: Platform) =>
    `https://docs.openreplay.com/en/session-replay/identify-user${p === 'web' ? '/#with-npm' : '/#with-ios-app'}`,
  invite: 'https://docs.openreplay.com/en/deployment/invite-team-members',
};

export const ingestPoint = () => `https://${window.location.hostname}/ingest`;
const isSaas = () => ingestPoint().includes('app.openreplay.com');

const lastMajor = ENV.TRACKER_MAJOR_VERSION
  ? ENV.TRACKER_MAJOR_VERSION
  : ENV.TRACKER_VERSION
    ? ENV.TRACKER_VERSION.split('.')[0]
    : null;

export const ASSIST_INSTALL = 'npm i @openreplay/tracker-assist';
export const ASSIST_USE = 'tracker.use(trackerAssist(options));';

export interface SnippetOptions {
  projectKey: string;
  host: string;
  platform: Platform;
  method: InstallMethod;
  ssr: boolean;
  inputMode: InputMode;
  maskNumbers: boolean;
  maskEmails: boolean;
  assist?: boolean;
}

export function installCommand(platform: Platform): {
  code: string;
  language: string;
  via: string;
} {
  if (platform === 'ios')
    return {
      language: 'Swift',
      via: 'CocoaPods or Swift Package Manager',
      code: `// make sure to grab latest version from https://github.com/openreplay/ios-tracker
// Cocoapods
pod 'Openreplay', '~> 1.0.5'

// Swift Package Manager
dependencies: [
    .package(url: "https://github.com/openreplay/ios-tracker.git", from: "1.0.5"),
]`,
    };
  if (platform === 'android')
    return {
      language: 'build.gradle',
      via: 'Gradle, via JitPack',
      code: `// Add it in your root build.gradle at the end of repositories:
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
}`,
    };
  return {
    language: 'npm',
    via: 'npm',
    code: `npm i @openreplay/tracker${lastMajor ? `@${lastMajor}` : ''}`,
  };
}

const modeCode = (m: InputMode) =>
  INPUT_MODES.find((x) => x.value === m)?.code ?? 0;

export function trackerSnippet(o: SnippetOptions): string {
  const ingest = ingestPoint();
  if (o.platform === 'ios')
    return `// AppDelegate.swift
import OpenReplay

class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // not required if you're using our SaaS version
        OpenReplay.shared.serverURL = "${ingest}"
        OpenReplay.shared.start(projectKey: "${o.projectKey}", options: .defaults)

        // ...
        return true
    }
// ...`;
  if (o.platform === 'android')
    return `// MainActivity.kt
import com.openreplay.tracker.OpenReplay

class MainActivity : TrackingActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // not required if you're using our SaaS version
        OpenReplay.serverURL = "${ingest}"
        // check out our SDK docs to see available options
        OpenReplay.start(
            applicationContext,
            "${o.projectKey}",
            OpenReplay.Options.defaults(),
            onStarted = {
                println("OpenReplay Started")
            })

        // ...
    }
}`;
  if (o.method === 'script')
    return `<!-- OpenReplay Tracking Code for ${o.host} -->
<script>
  var initOpts = {
    projectKey: "${o.projectKey}",
    ${isSaas() ? '// 0 - plain, 1 - obscured, 2 - ignored' : `ingestPoint: "${ingest}",`}
    defaultInputMode: ${modeCode(o.inputMode)},
    obscureTextNumbers: ${o.maskNumbers},
    obscureTextEmails: ${o.maskEmails},
  };
  var startOpts = { userID: "" };
  (function(A,s,a,y,e,r){
    r=window.OpenReplay=[e,r,y,[s-1, e]];
    s=document.createElement('script');s.src=A;s.async=!a;
    document.getElementsByTagName('head')[0].appendChild(s);
    r.start=function(v){r.push([0])};
    r.stop=function(v){r.push([1])};
    r.setUserID=function(id){r.push([2,id])};
    r.setUserAnonymousID=function(id){r.push([3,id])};
    r.setMetadata=function(k,v){r.push([4,k,v])};
    r.event=function(k,p,i){r.push([5,k,p,i])};
    r.issue=function(k,p){r.push([6,k,p])};
    r.isActive=function(){return false};
    r.getSessionToken=function(){};
  })("${trackerUrl(!!o.assist)}",1,0,initOpts,startOpts);
</script>`;
  const privacy =
    o.inputMode !== 'plain' || o.maskNumbers || o.maskEmails
      ? `
  defaultInputMode: ${modeCode(o.inputMode)},
  obscureTextNumbers: ${o.maskNumbers},
  obscureTextEmails: ${o.maskEmails},`
      : '';
  // the SaaS tracker already points at its own ingest
  const ingestLine = isSaas()
    ? ''
    : `
  ingestPoint: "${ingest}",`;
  if (o.ssr)
    return `import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope

tracker.configure({
  projectKey: "${o.projectKey}",${ingestLine}${privacy}
});

function MyApp() {
  useEffect(() => { // use componentDidMount in case of React Class Component
    tracker.start()
  }, []);

  //...
}`;
  return `import { tracker } from '@openreplay/tracker';

tracker.configure({
  projectKey: "${o.projectKey}",${ingestLine}${privacy}
});
tracker.start()`;
}

export function snippetPlacement(
  platform: Platform,
  method: InstallMethod,
): string {
  if (platform === 'ios')
    return 'Start it where your app launches, in the app delegate.';
  if (platform === 'android') return 'Start it in your main activity.';
  if (method === 'script')
    return 'Paste it before the closing </head> tag of your page.';
  return 'Start the tracker where your app boots.';
}

export interface MobileStep {
  title: string;
  hint?: string;
  code: string;
  language: string;
}

/** The mobile SDK's configuration and capture steps, after install and start. */
export function mobileSteps(platform: 'ios' | 'android'): MobileStep[] {
  const configuration = `let crashes: Bool
let analytics: Bool
let performances: Bool
let logs: Bool
let screen: Bool
let wifiOnly: Bool`;
  if (platform === 'ios')
    return [
      {
        title: 'Configuration',
        hint: 'By default, all options equal true.',
        language: 'Swift',
        code: configuration,
      },
      {
        title: 'Set up the touch events listener',
        language: 'SceneDelegate.swift',
        code: `// SceneDelegate.Swift
import OpenReplay

// ...
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        let contentView = ContentView()
            .environmentObject(TodoStore())

        if let windowScene = scene as? UIWindowScene {
            let window = TouchTrackingWindow(windowScene: windowScene) // <<<< here
            window.rootViewController = UIHostingController(rootView: contentView)
            self.window = window
            window.makeKeyAndVisible()
        }
    }
// ...`,
      },
      {
        title: 'Hide sensitive views',
        language: 'Swift',
        code: `import OpenReplay

// swiftUI
Text("Very important sensitive text")
    .sensitive()

// UIKit
OpenReplay.shared.addIgnoredView(view)`,
      },
      {
        title: 'Track inputs',
        language: 'Swift',
        code: `// swiftUI
TextField("Input", text: $text)
    .observeInput(text: $text, label: "tracker input #1", masked: Bool)

// UIKit will use placeholder as label and sender.isSecureTextEntry to mask the input
Analytics.shared.addObservedInput(inputEl)`,
      },
    ];
  return [
    {
      title: 'Configuration',
      hint: 'By default, all options equal true.',
      language: 'Kotlin',
      code: configuration,
    },
    {
      title: 'Set up the touch events listener',
      language: 'MainActivity.kt',
      code: `class MainActivity : ComponentActivity() {
    // ...
    OpenReplay.setupGestureDetector(this)
}`,
    },
    {
      title: 'Hide sensitive views',
      language: 'Kotlin',
      code: `import com.openreplay.tracker.OpenReplay

OpenReplay.addIgnoredView(view)`,
    },
    {
      title: 'Track inputs',
      language: 'Kotlin',
      code: `import com.openreplay.tracker.OpenReplay

val passwordEditText = binding.password
passwordEditText.trackTextInput(label = "password", masked = true)`,
    },
  ];
}

export function identifySnippet(
  platform: Platform,
  method: InstallMethod,
  userId: string,
): string {
  const id = JSON.stringify(userId);
  if (platform === 'ios') return `OpenReplay.shared.setUserID(${id})`;
  if (platform === 'android') return `OpenReplay.setUserID(${id})`;
  if (method === 'script') return `OpenReplay.setUserID(${id});`;
  return `tracker.setUserID(${id});`;
}

export const METADATA_EXAMPLES = [
  { key: 'plan', sample: 'premium' },
  { key: 'company', sample: 'Acme, Inc.' },
  { key: 'role', sample: 'admin' },
  { key: 'version', sample: '4.2.0' },
  { key: 'region', sample: 'eu-west' },
];
export const MAX_METADATA_KEYS = 10;

export function metadataSnippet(
  platform: Platform,
  method: InstallMethod,
  keys: readonly string[],
): string {
  return (keys.length ? keys : ['plan'])
    .map((k) => {
      const sample =
        METADATA_EXAMPLES.find((e) => e.key === k)?.sample ?? 'value';
      const args = `${JSON.stringify(k)}, ${JSON.stringify(sample)}`;
      if (platform === 'ios')
        return `OpenReplay.shared.setMetadata(key: ${JSON.stringify(k)}, value: ${JSON.stringify(sample)})`;
      if (platform === 'android') return `OpenReplay.setMetadata(${args})`;
      if (method === 'script') return `OpenReplay.setMetadata(${args});`;
      return `tracker.setMetadata(${args});`;
    })
    .join('\n');
}

export const isMetadataKey = (s: string) =>
  /^[a-zA-Z_][a-zA-Z0-9_-]{0,39}$/.test(s.trim());

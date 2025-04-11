/* eslint-disable i18next/no-literal-string */
import React from 'react';
import cn from 'classnames';
import { CopyButton, CodeBlock } from 'UI';
import stl from './installDocs.module.css';
import CircleNumber from '../../CircleNumber';
import { useTranslation } from 'react-i18next';

export const installationCommand = `
// make sure to grab latest version from https://github.com/openreplay/ios-tracker
// Cocoapods
pod 'Openreplay', '~> 1.0.5'

// Swift Package Manager
dependencies: [
    .package(url: "https://github.com/openreplay/ios-tracker.git", from: "1.0.5"),
]
`;

export const usageCode = `// AppDelegate.swift
import OpenReplay

//... 

class AppDelegate: UIResponder, UIApplicationDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // not required if you're using our SaaS version
        OpenReplay.shared.serverURL = "INGEST_POINT"
        OpenReplay.shared.start(projectKey: "PROJECT_KEY", options: .defaults)
        
        // ...
        return true
    }
// ...`;
const configuration = `let crashes: Bool
let analytics: Bool
let performances: Bool
let logs: Bool
let screen: Bool
let wifiOnly: Bool`;

const touches = `// SceneDelegate.Swift
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
// ...`;

const sensitive = `import OpenReplay

// swiftUI
Text("Very important sensitive text")
    .sensitive()
    
// UIKit
OpenReplay.shared.addIgnoredView(view)`;

const inputs = `// swiftUI
TextField("Input", text: $text)
    .observeInput(text: $text, label: "tracker input #1", masked: Bool)

// UIKit will use placeholder as label and sender.isSecureTextEntry to mask the input
Analytics.shared.addObservedInput(inputEl)`;

function MobileInstallDocs({ site, ingestPoint }: any) {
  const { t } = useTranslation();
  const _usageCode = usageCode
    .replace('INGEST_POINT', ingestPoint)
    .replace('PROJECT_KEY', site.projectKey);

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div>
        <div className="font-medium  flex gap-2 items-center">
          <CircleNumber text="1" />
          <span>{t('Install the Swift Package')}</span>
        </div>
        <div className={cn(stl.snippetWrapper, 'ml-8')}>
          <div className="absolute mt-1 mr-2 right-0">
            <CopyButton content={installationCommand} />
          </div>
          <CodeBlock code={installationCommand} language="bash" />
        </div>
      </div>

      <div>
        <div className="font-medium gap-2 flex items-center">
          <CircleNumber text="2" />
          <span>{t('Add to your app')}</span>
        </div>
        <div className="flex ml-8">
          <div className="w-full">
            <div className={cn(stl.snippetWrapper)}>
              <div className="absolute mt-1 mr-2 right-0">
                <CopyButton content={_usageCode} />
              </div>
              <CodeBlock code={_usageCode} language="swift" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="font-medium flex gap-2 items-center">
          <CircleNumber text="3" />
          <span>{t('Configuration')}</span>
        </div>
        <div className="flex ml-8 ">
          <div className="w-full">
            <div className={cn(stl.snippetWrapper)}>
              <CodeBlock code={configuration} language="swift" />
              <div className="mt-2">
                {t('By default, all options equals')}
                <code className="p-1 text-red rounded bg-gray-lightest">
                  true
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
        <div className="flex ml-8">
          <div className="w-full">
            <div className={cn(stl.snippetWrapper)}>
              <div className="absolute mt-1 mr-2 right-0">
                <CopyButton content={touches} />
              </div>
              <CodeBlock code={touches} language="swift" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="font-medium flex gap-2 items-center">
          <CircleNumber text="5" />
          <span>{t('Hide sensitive views')}</span>
        </div>
        <div className="flex ml-8">
          <div className="w-full">
            <div className={cn(stl.snippetWrapper)}>
              <div className="absolute mt-1 mr-2 right-0">
                <CopyButton content={sensitive} />
              </div>
              <CodeBlock code={sensitive} language="swift" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="font-medium flex gap-2 items-center">
          <CircleNumber text="6" />
          <span>&nbsp;{t('Track inputs')}</span>
        </div>
        <div className="flex ml-8">
          <div className="w-full">
            <div className={cn(stl.snippetWrapper)}>
              <div className="absolute mt-1 mr-2 right-0">
                <CopyButton content={inputs} />
              </div>
              <CodeBlock code={inputs} language="swift" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileInstallDocs;

import {
  requireNativeComponent,
  UIManager,
  Platform,
  NativeModules,
  View,
  TextInput,
} from 'react-native';
import type { ViewProps, TextInputProps } from 'react-native';
import network from './network';
import type { Options as NetworkOptions } from './network';

const { ORTrackerConnector } = NativeModules;

const LINKING_ERROR =
  `The package '@openreplay/react-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

type RntrackerProps = ViewProps & {
  viewName: string;
  screenName: string;
  children: any;
};

const RntrackerSanitizedView =
  UIManager.getViewManagerConfig('RntrackerSanitizedView') != null
    ? requireNativeComponent<ViewProps>('RntrackerSanitizedView')
    : () => {
        throw new Error('RntrackerSanitizedView; ' + LINKING_ERROR);
      };

const RntrackerInput =
  UIManager.getViewManagerConfig('RntrackerInput') != null
    ? requireNativeComponent<TextInputProps>('RntrackerInput')
    : () => {
        throw new Error('RntrackerInput; ' + LINKING_ERROR);
      };

const RntrackerView =
  UIManager.getViewManagerConfig('RntrackerView') != null
    ? requireNativeComponent<RntrackerProps>('RntrackerView')
    : () => {
        throw new Error('RntrackerView; ' + LINKING_ERROR);
      };

const RntrackerTouchTrackingView =
  UIManager.getViewManagerConfig('RntrackerTouch') != null
    ? requireNativeComponent<ViewProps>('RntrackerTouch')
    : () => {
        throw new Error('RntrackerTouchTrackingView; ' + LINKING_ERROR);
      };

interface Options {
  crashes?: boolean;
  analytics?: boolean;
  performances?: boolean;
  logs?: boolean;
  screen?: boolean;
}

interface IORTrackerConnector {
  startSession: (
    projectKey: string,
    optionsDict: Options,
    projectUrl?: string
  ) => void;
  setMetadata: (key: string, value: string) => void;
  event: (name: string, payload?: string) => void;
  setUserID: (userID: string) => void;
  userAnonymousID: (userID: string) => void;
  networkRequest: (
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    requestJSON: string,
    responseJSON: string,
    status: number,
    duration: number
  ) => void;
}

const emptyShell = {
  startSession: () =>
    console.log('Openreplay: SDK only supports iOS at the moment'),
  setMetadata: () => null,
  event: () => null,
  setUserID: () => null,
  userAnonymousID: () => null,
  networkRequest: () => null,
};

let patched = false;
const patchNetwork = (
  ctx = global,
  isServiceUrl = () => false,
  opts: Partial<NetworkOptions>
) => {
  if (!patched) {
    network(ctx, ORTrackerConnector.networkRequest, isServiceUrl, opts);
    patched = true;
  }
};

export default {
  tracker:
    Platform.OS === 'ios'
      ? (ORTrackerConnector as IORTrackerConnector)
      : emptyShell,
  patchNetwork: Platform.OS === 'ios' ? patchNetwork : () => null,
  ORTouchTrackingView:
    Platform.OS === 'ios' ? RntrackerTouchTrackingView : View,
  ORSanitizedView: Platform.OS === 'ios' ? RntrackerSanitizedView : View,
  ORTrackedInput: Platform.OS === 'ios' ? RntrackerInput : TextInput,
  ORAnalyticsView: Platform.OS === 'ios' ? RntrackerView : View,
};

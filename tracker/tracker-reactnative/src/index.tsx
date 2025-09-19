import {
  NativeModules,
  Platform,
  requireNativeComponent,
  type TextInputProps,
  UIManager,
  type ViewProps,
} from 'react-native';
import network from './network';
import type { Options as NetworkOptions } from './network';

const { ORTrackerConnector } = NativeModules;

const LINKING_ERROR =
  `The package '@openreplay/react-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

interface Options {
  crashes?: boolean;
  analytics?: boolean;
  performances?: boolean;
  logs?: boolean;
  screen?: boolean;
  debugLogs?: boolean;
}

interface IORTrackerConnector {
  startSession: (
    projectKey: string,
    optionsDict: Options,
    projectUrl?: string
  ) => void;
  /**
   * @param type - type of message (only gql at the moment)
   * @param msg - JSON string containing message to be sent
   * */
  sendMessage: (type: string, msg: string) => void;
  stop: () => void;
  getSessionID: () => Promise<string>;
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

const RnTrackerTouchTrackingView =
  UIManager.getViewManagerConfig('RnTrackerTouchView') != null
    ? requireNativeComponent<ViewProps>('RnTrackerTouchView')
    : () => {
        throw new Error('RnTrackerTouchView; ' + LINKING_ERROR);
      };

const ORTrackedInput =
  UIManager.getViewManagerConfig('RnTrackedInput') != null
    ? requireNativeComponent<TextInputProps>('RnTrackedInput')
    : () => {
        throw new Error('RnTrackedInput; ' + LINKING_ERROR);
      };

const ORSanitizedView =
  UIManager.getViewManagerConfig('RnSanitizedView') != null
    ? requireNativeComponent<ViewProps>('RnSanitizedView')
    : () => {
        throw new Error('RnSanitizedView; ' + LINKING_ERROR);
      };

export function setMetadata(key: string, value: string) {
  ORTrackerConnector.setMetadata(key, value);
}

export function setUserID(userID: string) {
  ORTrackerConnector.setUserID(userID);
}

/**
 * Can be used with OR gql (Relay/Apollo) plugin:
 * ```
 * const appWrapper = {
 *   active: () => true,
 *   send: (gqlMsg) => {
 *     const type = 'gql';
 *     const msg = JSON.stringify({
 *       operationKind: gqlMsg[1],
 *       operationName: gqlMsg[2],
 *       variables: gqlMsg[3],
 *       response: gqlMsg[4],
 *       duration: gqlMsg[5],
 *     })
 *     sendMessage(type, msg);
 *   }
 * }
 * ```
 * */
export function sendMessage(type: string, msg: string) {
  ORTrackerConnector.sendMessage(type, msg);
}


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
  tracker: ORTrackerConnector as IORTrackerConnector,
  sendCustomMessage: sendMessage,
  patchNetwork: patchNetwork,
  ORTouchTrackingView: RnTrackerTouchTrackingView,
  ORTrackedInput: ORTrackedInput,
  ORSanitizedView: ORSanitizedView,
};

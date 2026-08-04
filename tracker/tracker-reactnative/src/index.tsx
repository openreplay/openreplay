import * as React from 'react';
import {
  NativeModules,
  Platform,
  requireNativeComponent,
  StyleSheet,
  TurboModuleRegistry,
  type TextInputProps,
  UIManager,
  View,
  type ViewProps,
} from 'react-native';
import type { TurboModule } from 'react-native';
import network from './network';
import type { Options as NetworkOptions } from './network';

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
  debugImages?: boolean;
  wifiOnly?: boolean;
  fps?: number;
  screenshotFrequency?: 'low' | 'standard' | 'high';
  screenshotQuality?: 'low' | 'standard' | 'high';
}

interface IORTrackerConnector extends TurboModule {
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

// Use TurboModules when available (new architecture), fall back to NativeModules (old architecture)
const ORTrackerConnector: IORTrackerConnector =
  TurboModuleRegistry.get<IORTrackerConnector>('ORTrackerConnector') ??
  NativeModules.ORTrackerConnector;

const RnTrackerTouchTrackingView =
  UIManager.getViewManagerConfig('RnTrackerTouchView') != null
    ? requireNativeComponent<ViewProps>('RnTrackerTouchView')
    : () => {
        throw new Error('RnTrackerTouchView; ' + LINKING_ERROR);
      };

interface ORTrackedInputProps extends TextInputProps {
  trackingLabel?: string;
}

const ORTrackedInput =
  UIManager.getViewManagerConfig('RnTrackedInput') != null
    ? requireNativeComponent<ORTrackedInputProps>('RnTrackedInput')
    : () => {
        throw new Error('RnTrackedInput; ' + LINKING_ERROR);
      };

const RnSanitizedMarker =
  UIManager.getViewManagerConfig('RnSanitizedView') != null
    ? requireNativeComponent<ViewProps>('RnSanitizedView')
    : null;

/**
 * Marks its subtree as sensitive so it gets masked in the replay.
 *
 * The native view is rendered as an invisible, absolutely positioned sibling
 * *behind* the children instead of as their parent, and the wrapper is marked
 * `collapsable={false}`.
 *
 * `RnSanitizedView` is a legacy (paper) ViewManager, so on the new architecture
 * RN mounts it through the Fabric interop layer. When one interop view ends up
 * as the direct view-child of another interop view,
 * `RCTLegacyViewManagerInteropComponentView` re-parents the inner paper view
 * into the outer paper view, while the inner view's frame keeps being driven by
 * `layoutMetrics.getContentFrame()` - origin (0, 0) of the outer region, size
 * shrunk by the inner content insets. Everything inside the inner region is
 * then drawn at the wrong offset and with the wrong width. Fabric flattens
 * layout-only `View`s, so an intermediate plain `View` is not enough to keep the
 * two native views apart - hence a childless native view (never an interop
 * parent) plus a non-collapsable wrapper (never flattened away).
 */
const ORSanitizedView = React.forwardRef<View, ViewProps>(
  ({ children, ...rest }, ref) => {
    if (RnSanitizedMarker == null) {
      throw new Error('RnSanitizedView; ' + LINKING_ERROR);
    }
    return (
      <View ref={ref} collapsable={false} {...rest}>
        <RnSanitizedMarker style={styles.marker} pointerEvents="none" />
        {children}
      </View>
    );
  }
);
ORSanitizedView.displayName = 'ORSanitizedView';

const styles = StyleSheet.create({
  marker: StyleSheet.absoluteFillObject,
});

interface ORTrackedViewProps extends ViewProps {
  screenName: string;
  viewName: string;
}

const RnTrackedViewMarker =
  UIManager.getViewManagerConfig('RnTrackerView') != null
    ? requireNativeComponent<Omit<ORTrackedViewProps, 'children'>>(
        'RnTrackerView'
      )
    : null;

/**
 * Reports its region to the tracker as a named, observable view.
 *
 * Rendered the same way as {@link ORSanitizedView} - a childless native marker
 * behind the children instead of around them - because it hits the same Fabric
 * interop layout bug. See the note on `ORSanitizedView`.
 */
const ORTrackedView = React.forwardRef<View, ORTrackedViewProps>(
  ({ children, screenName, viewName, ...rest }, ref) => {
    if (RnTrackedViewMarker == null) {
      throw new Error('RnTrackerView; ' + LINKING_ERROR);
    }
    return (
      <View ref={ref} collapsable={false} {...rest}>
        <RnTrackedViewMarker
          screenName={screenName}
          viewName={viewName}
          style={styles.marker}
          pointerEvents="none"
        />
        {children}
      </View>
    );
  }
);
ORTrackedView.displayName = 'ORTrackedView';

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
  opts: Partial<NetworkOptions> = {}
) => {
  if (!patched) {
    const rnOpts: Partial<NetworkOptions> = { mode: 'all', ...opts };
    network(
      ctx,
      ORTrackerConnector.networkRequest as any,
      isServiceUrl,
      rnOpts
    );
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
  ORTrackedView: ORTrackedView,
};

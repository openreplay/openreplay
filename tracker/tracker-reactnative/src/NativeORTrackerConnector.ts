import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  start(
    projectKey: string,
    optionsDict: Object,
    projectUrl: string | null
  ): void;
  startSession(
    projectKey: string,
    optionsDict: Object,
    projectUrl: string | null
  ): void;
  stop(): void;
  getSessionID(): Promise<string>;
  setMetadata(key: string, value: string): void;
  event(name: string, object: string | null): void;
  setUserID(userID: string): void;
  userAnonymousID(userID: string): void;
  networkRequest(
    url: string,
    method: string,
    requestJSON: string,
    responseJSON: string,
    status: number,
    duration: number
  ): void;
  sendMessage(msgType: string, msg: string): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ORTrackerConnector');

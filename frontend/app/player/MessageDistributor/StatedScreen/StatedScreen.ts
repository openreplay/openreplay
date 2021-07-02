import Screen, { INITIAL_STATE as SUPER_INITIAL_STATE, State as SuperState }  from './Screen';
import { update, getState } from '../../store';


export interface State extends SuperState {
  messagesLoading: boolean,
  cssLoading: boolean,
  disconnected: boolean,
  userPageLoading: boolean, 
}

export const INITIAL_STATE: State = {
  ...SUPER_INITIAL_STATE,
  messagesLoading: false,
  cssLoading: false,
  disconnected: false,
  userPageLoading: false,
}

export default class StatedScreen extends Screen {
  constructor() { super(); }

  setMessagesLoading(messagesLoading: boolean) {
    // @ts-ignore
    this.display(!messagesLoading);
    update({ messagesLoading });
  }

  setCSSLoading(cssLoading: boolean) {
    // @ts-ignore

    this.displayFrame(!cssLoading);
    update({ cssLoading });
  }

  setDisconnected(disconnected: boolean) {
    if (!getState().live) return; //?
      // @ts-ignore
    this.display(!disconnected);
    update({ disconnected });
  }

  setUserPageLoading(userPageLoading: boolean) {
     // @ts-ignore
    this.display(!userPageLoading);
    update({ userPageLoading });
  }

  setSize({ height, width }: { height: number, width: number }) {
    update({ width, height });
    // @ts-ignore
    this.scale();
  }
}
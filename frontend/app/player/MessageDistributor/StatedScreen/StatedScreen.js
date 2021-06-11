import Screen, { INITIAL_STATE as SUPER_INITIAL_STATE }  from './Screen';
import { update, getState } from '../../store';

export const INITIAL_STATE = {
  ...SUPER_INITIAL_STATE,
  messagesLoading: false,
  cssLoading: false,
  disconnected: false,
  userPageLoading: false,
}

export default class StatedScreen extends Screen {

  setMessagesLoading(messagesLoading) {
    this.display(!messagesLoading);
    update({ messagesLoading });
  }

  setCSSLoading(cssLoading) {
    this.displayFrame(!cssLoading);
    update({ cssLoading });
  }

  setDisconnected(disconnected) {
    if (!getState().live) return; //?
    this.display(!disconnected);
    update({ disconnected });
  }

  setUserPageLoading(userPageLoading) {
    this.display(!userPageLoading);
    update({ userPageLoading });
  }

  setSize({ height, width }) {
    update({ width, height });
    this.scale();
  }
}
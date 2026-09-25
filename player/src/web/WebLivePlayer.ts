import type { Store, SessionFilesInfo, PlayerMsg } from '../index';
import WebPlayer from './WebPlayer';
import AssistManager from './assist/AssistManager';
import { requestEFSDom } from './network/loadFiles';

export default class WebLivePlayer extends WebPlayer {
  static readonly INITIAL_STATE = {
    ...WebPlayer.INITIAL_STATE,
    ...AssistManager.INITIAL_STATE,
    liveTimeTravel: false,
  };

  assistManager: AssistManager; // public so far

  /**
   * Live messages kept until the first successful time travel: the EFS file lags the
   * stream (tracker flush + ingestion), and if it fails to load they rebuild the page.
   */
  private incomingMessages: PlayerMsg[] = [];

  private cleaned = false;

  private historyFileIsLoading = false;

  private lastMessageInFileTime = 0;

  private timetravelPromise: Promise<boolean> | null = null;

  constructor(
    wpState: Store<typeof WebLivePlayer.INITIAL_STATE>,
    private session: SessionFilesInfo,
    config: RTCIceServer[] | null,
    agentId: number,
    projectId: number,
    uiErrorHandler?: { error: (msg: string) => void },
  ) {
    super(wpState, session, true, false, uiErrorHandler);

    this.assistManager = new AssistManager(
      session,
      (f) => this.messageManager.setMessagesLoading(f),
      (msg) => {
        if (!this.wpState.get().liveTimeTravel) {
          this.incomingMessages.push(msg);
        }
        if (!this.historyFileIsLoading) {
          this.messageManager.distributeMessage(msg);
        }
      },
      this.screen,
      config,
      wpState,
      (id) => this.messageManager.getNode(id),
      agentId,
      this.messageManager.updateSpriteMap,
      uiErrorHandler,
    );
    this.assistManager.connect(session.agentToken!, agentId, projectId);
  }

  /**
   * Loads in-progress dom file from EFS directly
   * then reads it to add everything happened before "now" to message manager
   * to be able to replay it like usual
   * */
  toggleTimetravel = () => {
    if (
      (this.wpState.get() as typeof WebLivePlayer.INITIAL_STATE).liveTimeTravel
    ) {
      return Promise.resolve(false);
    }
    // repeated timeline clicks while the file is loading share one load
    if (!this.timetravelPromise) {
      this.timetravelPromise = this.loadTimetravel().finally(() => {
        this.timetravelPromise = null;
      });
    }
    return this.timetravelPromise;
  };

  private loadTimetravel = async () => {
    let result = false;
    this.lastMessageInFileTime = 0;
    this.historyFileIsLoading = true;
    this.messageManager.setMessagesLoading(true); // do it in one place. update unique  loading states each time instead
    this.messageManager.resetMessageManagers();

    try {
      const bytes = await requestEFSDom(this.session.sessionId);
      if (this.cleaned) return false;
      const reader = this.messageLoader.createNewParser(
        false,
        (msgs) => {
          msgs.forEach((msg) => {
            if (msg.time > this.lastMessageInFileTime) {
              this.lastMessageInFileTime = msg.time;
            }
            this.messageManager.distributeMessage(msg);
          });
        },
        'cobrowse dom',
      );
      await reader(bytes);

      this.wpState.update({
        liveTimeTravel: true,
      });
      result = true;
      // here we need to update also lists state, if we're going use them this.messageManager.onFileReadSuccess
    } catch (e) {
      if (this.cleaned) return false;
      this.uiErrorHandler?.error('Error requesting a session file');
      console.error('EFS file download error:', e);
    }
    if (this.cleaned) return false;

    // live messages the (lagging) file doesn't have yet; ones at its last timestamp
    // may be duplicates, which is safer than dropping mutations
    this.incomingMessages
      .filter((msg) => msg.time >= this.lastMessageInFileTime)
      .forEach((msg) => this.messageManager.distributeMessage(msg));
    if (result) {
      // after a successful time travel the managers hold everything
      this.incomingMessages = [];
    }

    this.historyFileIsLoading = false;
    this.messageManager.setMessagesLoading(false);
    return result;
  };

  jumpToLive = () => {
    this.wpState.update({
      live: true,
      livePlay: true,
    });
    this.jump(this.wpState.get().lastMessageTime);
  };

  clean() {
    this.cleaned = true;
    this.incomingMessages = [];
    this.assistManager.clean();
    super.clean();
  }
}

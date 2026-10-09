import { Log, LogLevel, SessionFilesInfo } from '../index';

import type { Store } from '../index';
import { isPlayerDebug } from '../config';
import { Message } from './messages';
import Player from '../player/Player';
import MessageLoader from './MessageLoader';
import MessageManager from './MessageManager';
import Screen, { ScaleMode } from './Screen/Screen';
import InspectorController from './addons/InspectorController';
import TargetMarker from './addons/TargetMarker';

export default class WebPlayer extends Player {
  static readonly INITIAL_STATE = {
    ...Player.INITIAL_STATE,
    ...TargetMarker.INITIAL_STATE,
    ...MessageManager.INITIAL_STATE,
    ...MessageLoader.INITIAL_STATE,
    ...InspectorController.INITIAL_STATE,

    liveTimeTravel: false,
    inspectorMode: false,
    mobsFetched: false,
  };
  private inspectorController: InspectorController;
  protected screen: Screen;
  protected readonly messageManager: MessageManager;
  protected readonly messageLoader: MessageLoader;
  private targetMarker: TargetMarker;
  private scaleFrame = 0;
  private readonly globalJumpToTime = (time: number, silent?: boolean) =>
    this.jump(time, silent);
  private devTools: Record<string, any> | null = null;

  constructor(
    protected wpState: Store<typeof WebPlayer.INITIAL_STATE>,
    session: SessionFilesInfo,
    live: boolean,
    isClickMap = false,
    public readonly uiErrorHandler?: { error: (msg: string) => void },
    private readonly prefetched?: boolean,
  ) {
    const initialLists = live
      ? {}
      : {
          event: session.events || [],
          stack: session.stackEvents || [],
          frustrations: session.frustrations || [],
          exceptions:
            session.errors?.map(({ name, ...rest }: any) =>
              Log({
                level: LogLevel.ERROR,
                value: name,
                ...rest,
              }),
            ) || [],
        };

    const screen = new Screen(
      session.isMobile,
      isClickMap ? ScaleMode.AdjustParentHeight : ScaleMode.Embed,
    );
    const messageManager = new MessageManager(
      session,
      wpState,
      screen,
      initialLists,
      uiErrorHandler,
    );
    const messageLoader = new MessageLoader(
      session,
      wpState,
      messageManager,
      isClickMap,
      uiErrorHandler,
    );
    super(wpState, messageManager);
    this.screen = screen;
    this.messageManager = messageManager;
    this.messageLoader = messageLoader;
    // timer/highlight mode: hold the replay for a moment on each highlighted click
    messageManager.setOnClickPause((ms) => this.pauseFor(ms));

    if (!live && !prefetched) {
      // hack. TODO: split OfflinePlayer class
      void messageLoader.loadFiles();
      wpState.update({ mobsFetched: true });
    }

    this.targetMarker = new TargetMarker(this.screen, wpState);
    this.inspectorController = new InspectorController(screen, wpState);

    const endTime = session.duration?.valueOf() || 0;
    wpState.update({
      // @ts-ignore
      session,

      live,
      livePlay: live,
      endTime, // : 0,
    });

    // @ts-ignore external automation hook
    window.playerJumpToTime = this.globalJumpToTime;
    this.exposeDevTools(session);
  }

  private exposeDevTools(session: SessionFilesInfo) {
    // @ts-ignore host-provided debug console (frontend/app/dev/console.js)
    const devTools = window.__OPENREPLAY_DEV_TOOLS__;
    if (!devTools || typeof devTools !== 'object') return;
    this.devTools = devTools;
    Object.assign(devTools, {
      player: this,
      getNode: (nodeId: number, tabId?: string) => {
        if (tabId) {
          console.log(this.messageManager.tabs[tabId].getNode(nodeId));
        } else {
          Object.values(this.messageManager.tabs).forEach((tab) =>
            console.log(tab.getNode(nodeId)),
          );
        }
      },
      getNodeMessages: (nodeId: number, tabId?: string) => {
        if (!isPlayerDebug()) {
          console.log('Raw messages are kept only in debug mode (logStuff(true), reload)');
        }
        let messages = this.messageLoader.rawMessages.filter(
          (m) => m.id === nodeId,
        );
        if (tabId) {
          messages = messages.filter((m) => m.tabId === tabId);
        }
        console.log(messages);
      },
      getDebugData: () => ({
        trackerVersion: session?.trackerVersion,
        sessionData: session,
        messageMetadata: this.messageLoader.rawMessages.map((m) => ({
          tp: m.tp,
          time: m.time,
          tabId: m.tabId,
          tag: m.tag,
          id: m.id,
          parentID: m.parentID,
        })),
      }),
    });
  }

  enableVMode = () => {
    this.messageManager.setVirtualMode(true);
  };

  preloadFirstFile(data: Uint8Array, fileKey?: string) {
    void this.messageLoader.preloadFirstFile(data, fileKey);
  }

  getMessageTab = ({ time }: { time: number }) => {
    return this.messageManager.messageTabSourceManager.findTab(time);
  };

  setOnCluster = (cb: (coords: any[]) => void) => {
    this.targetMarker.setOnCluster(cb);
  };

  reinit(session: SessionFilesInfo) {
    if (this.wpState.get().mobsFetched) return; // already initialized
    this.wpState.update({ mobsFetched: true });
    this.messageLoader.setSession(session);
    this.messageManager.setSession(session);
    void this.messageLoader.loadFiles();

    this.targetMarker.destroy();
    this.targetMarker = new TargetMarker(this.screen, this.wpState);
    this.inspectorController = new InspectorController(
      this.screen,
      this.wpState,
    );

    const endTime = session.duration?.valueOf() || 0;
    this.wpState.update({
      // @ts-ignore
      session,
      endTime, // : 0,
    });

    // @ts-ignore external automation hook
    window.playerJumpToTime = this.globalJumpToTime;
  }

  updateLists = (session: any) => {
    const lists = {
      event: session.events || [],
      frustrations: session.frustrations || [],
      stack: session.stackEvents || [],
      exceptions:
        session.errors?.map(({ name, ...rest }: any) =>
          Log({
            level: LogLevel.ERROR,
            value: name,
            ...rest,
          }),
        ) || [],
    };
    this.messageManager.updateLists(lists);
  };

  attach = (parent: HTMLElement, isClickmap?: boolean) => {
    this.screen.attach(parent);
    if (!isClickmap) {
      window.removeEventListener('resize', this.onWindowResize);
      window.addEventListener('resize', this.onWindowResize);
      this.scale();
    }
  };

  /** Resize events fire many times per frame while dragging; scale at most once per frame. */
  private onWindowResize = () => {
    if (this.scaleFrame) return;
    this.scaleFrame = requestAnimationFrame(() => {
      this.scaleFrame = 0;
      this.scale();
    });
  };

  scale = () => {
    // sometimes called after clean() (live assist, late resize)
    if (!this.screen) return;
    const { width, height } = this.wpState.get();
    this.screen.scale({ width, height });
    this.targetMarker?.updateMarkedTargets();
  };

  // delayed message decoding for state plugins
  decodeMessage = (msg: Message) => this.messageManager.decodeMessage(msg);

  // Inspector & marker
  mark(e: Element) {
    this.inspectorController.marker?.mark(e);
  }

  toggleInspectorMode = (flag: boolean) => {
    if (typeof flag !== 'boolean') {
      const { inspectorMode } = this.wpState.get();
      flag = !inspectorMode;
    }

    if (flag) {
      this.pause();
      this.wpState.update({ inspectorMode: true });
      return this.inspectorController.enableInspector();
    }
    this.inspectorController.disableInspector();
    this.wpState.update({ inspectorMode: false });
  };

  markBySelector = (selector: string) => {
    this.inspectorController.markBySelector(selector);
  };

  // Target Marker
  setActiveTarget = (...args: Parameters<TargetMarker['setActiveTarget']>) => {
    this.targetMarker.setActiveTarget(...args);
  };

  markTargets = (...args: Parameters<TargetMarker['markTargets']>) => {
    // marking needs a still page; clearing the marks must not stop playback
    if (args[0]) this.pause();
    this.targetMarker.markTargets(...args);
  };

  showClickmap = (...args: Parameters<TargetMarker['injectTargets']>) => {
    this.screen?.overlay?.remove?.(); // hack. TODO: 1.split Screen functionalities (overlay, mounter) 2. separate ClickMapPlayer class that does not create overlay
    this.freeze().then(() => {
      this.targetMarker.injectTargets(...args);
    });
  };

  toggleUserName = (name?: string) => {
    this.screen.cursor.showTag(name);
  };

  changeTab = (tab: string) => {
    const { playing } = this.wpState.get();
    this.pause();
    this.messageManager.changeTab(tab);
    if (playing) {
      this.play();
    }
  };

  clean() {
    window.removeEventListener('resize', this.onWindowResize);
    cancelAnimationFrame(this.scaleFrame);
    this.messageLoader.clean();
    super.clean();
    this.targetMarker?.destroy();
    this.screen?.clean?.();
    // @ts-ignore
    this.screen = undefined;
    // @ts-ignore
    this.messageManager = undefined;
    // @ts-ignore
    if (window.playerJumpToTime === this.globalJumpToTime) {
      // @ts-ignore
      delete window.playerJumpToTime;
    }
    if (this.devTools?.player === this) {
      delete this.devTools.player;
      delete this.devTools.getNode;
      delete this.devTools.getNodeMessages;
      delete this.devTools.getDebugData;
    }
    this.devTools = null;
  }
}

import { Log, LogLevel, SessionFilesInfo } from 'App/player';

import type { Store } from 'App/player';
import { Message } from 'Player/web/messages';
import Player from '../player/Player';
import MessageManager from './MessageManager';
import MessageLoader from './MessageLoader';
import InspectorController from './addons/InspectorController';
import TargetMarker from './addons/TargetMarker';
import Screen, { ScaleMode } from './Screen/Screen';

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

    // @ts-ignore
    window.playerJumpToTime = this.jump.bind(this);
    // @ts-ignore
    window.__OPENREPLAY_DEV_TOOLS__.player = this;
  }

  enableVMode = () => {
    this.messageManager.setVirtualMode(true);
  }

  preloadFirstFile(data: Uint8Array, fileKey?: string) {
    void this.messageLoader.preloadFirstFile(data, fileKey);
  }

  reinit(session: SessionFilesInfo) {
    if (this.wpState.get().mobsFetched) return; // already initialized
    this.messageLoader.setSession(session);
    this.messageManager.setSession(session);
    void this.messageLoader.loadFiles();

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

    // @ts-ignore
    window.playerJumpToTime = this.jump.bind(this);
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
      window.addEventListener('resize', this.scale);
      this.scale();
    }
  };

  scale = () => {
    const { width, height } = this.wpState.get();
    if (!this.screen && !this.inspectorController) return;
    // sometimes happens in live assist sessions for some reason
    this.screen?.scale?.({ width, height });
    this.inspectorController?.scale?.({ width, height });

    this.targetMarker.updateMarkedTargets();
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
    this.pause();
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

  // toggle range -> from super
  toggleRange = (start: number, end: number) => {
    super.toggleRange(start, end);
  };

  changeTab = (tab: string) => {
    const { playing } = this.wpState.get();
    this.pause();
    this.messageManager.changeTab(tab);
    if (playing) {
      this.play();
    }
  };

  clean = () => {
    super.clean();
    this.screen?.clean?.();
    // @ts-ignore
    this.screen = undefined;
    this.messageLoader.clean();
    // @ts-ignore
    this.messageManager = undefined;
    window.removeEventListener('resize', this.scale);
  };
}

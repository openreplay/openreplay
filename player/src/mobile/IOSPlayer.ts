import { Log, LogLevel, SessionFilesInfo } from '../index';

import type { Store } from '../index';
import MessageLoader from '../web/MessageLoader';
import IOSMessageManager from './IOSMessageManager';
import Player from '../player/Player';
import Screen, { ScaleMode } from '../web/Screen/Screen';

export const PlayerMode = {
  VIDEO: 'video',
  SNAPS: 'snaps',
};

export default class IOSPlayer extends Player {
  static readonly INITIAL_STATE = {
    ...Player.INITIAL_STATE,
    ...MessageLoader.INITIAL_STATE,
    ...IOSMessageManager.INITIAL_STATE,
    scale: 1,
    mode: null,
    autoplay: false,
  };

  public screen: Screen;

  protected messageManager: IOSMessageManager;

  protected readonly messageLoader: MessageLoader;

  /** Aborts frame/tar downloads when the player is cleaned. */
  private readonly abortController = new AbortController();

  private resizeListening = false;

  constructor(
    protected wpState: Store<any>,
    session: SessionFilesInfo,
    public readonly uiErrorHandler?: { error: (msg: string) => void },
  ) {
    const hasTar = session.videoURL.some((url) => url.includes('.tar.'));
    const screen = new Screen(true, ScaleMode.Embed);
    const messageManager = new IOSMessageManager(
      session,
      wpState,
      screen,
      uiErrorHandler,
    );
    const messageLoader = new MessageLoader(
      session,
      wpState,
      messageManager,
      false,
      uiErrorHandler,
    );
    super(wpState, messageManager);
    this.pause();
    this.screen = screen;
    this.messageManager = messageManager;
    this.messageLoader = messageLoader;

    void this.loadVisuals(session, hasTar);
    void messageLoader.loadFiles();
    const endTime = session.duration?.valueOf() || 0;

    wpState.update({
      session,
      endTime,
    });
  }

  /** frames file → tar archive → mp4, whichever loads first */
  private async loadVisuals(session: SessionFilesInfo, hasTar: boolean) {
    const { signal } = this.abortController;
    const snapshotManager = this.messageManager.snapshotManager;
    // the API sends a list, older callers a single url
    const framesUrl = ([] as string[]).concat(session.mobileFrames ?? [])[0];
    const tarUrl = hasTar
      ? session.videoURL.find((url) => url.includes('.tar.'))
      : undefined;
    const hasVideo = session.videoURL.some((url) => url.includes('.mp4'));

    const attempts: Array<() => Promise<void>> = [];
    if (framesUrl) {
      attempts.push(() =>
        snapshotManager.loadFrames(framesUrl, session.startedAt, signal),
      );
    }
    if (tarUrl) {
      attempts.push(() =>
        snapshotManager.loadTar(tarUrl, session.startedAt, signal),
      );
    }
    for (const attempt of attempts) {
      try {
        await attempt();
        if (signal.aborted) return;
        this.wpState.update({ mode: PlayerMode.SNAPS });
        return;
      } catch (e) {
        if (signal.aborted) return;
        console.warn('Failed to load mobile frames', e);
      }
    }
    if (hasVideo) {
      this.wpState.update({ mode: PlayerMode.VIDEO });
    } else if (attempts.length) {
      this.wpState.update({ mode: PlayerMode.SNAPS });
      this.uiErrorHandler?.error('Could not load session screenshots');
    }
  }

  attach = (parent: HTMLElement) => {
    this.screen.attach(parent);
  };

  public updateDimensions(dimensions: {
    width: number;
    height: number;
    sourceWidth?: number;
    sourceHeight?: number;
  }) {
    return this.messageManager.updateDimensions(dimensions);
  }

  public updateLists(session: any) {
    // the events panel reads these very objects, so the rename stays in place
    session.events?.forEach((e: Record<string, any>) => {
      if (e.name === 'Click') e.name = 'Touch';
    });
    const exceptions = (session.crashes || []).concat(session.errors || []);
    const lists = {
      frustrations: session.frustrations || [],
      exceptions: exceptions.map(({ name, ...rest }: any) =>
        Log({
          level: LogLevel.ERROR,
          value: name,
          name,
          message: rest.reason,
          errorId: rest.crashId || rest.errorId,
          ...rest,
        }),
      ),
    };

    return this.messageManager.updateLists(lists);
  }

  public updateOverlayStyle(style: Partial<CSSStyleDeclaration>) {
    this.screen.updateOverlayStyle(style);
  }

  injectPlayer = (player: HTMLElement, stableTop?: boolean) => {
    this.screen.addToBody(player);
    this.screen.addMobileStyles(stableTop);

    if (!this.resizeListening) {
      this.resizeListening = true;
      window.addEventListener('resize', this.onWindowResize);
    }
  };

  private onWindowResize = () =>
    this.customScale(this.customConstrains.width, this.customConstrains.height);

  scale = () => {
    // const { width, height } = this.wpState.get()
    if (!this.screen) return;
    console.debug('using customConstrains to scale player');
    // sometimes happens in live assist sessions for some reason
    this.screen?.scale?.(this.customConstrains);
  };

  customConstrains = {
    width: 0,
    height: 0,
  };

  customScale = (width: number, height: number) => {
    if (!this.screen) return;
    this.screen?.scale?.({ width, height });
    this.customConstrains = { width, height };
    this.wpState.update({ scale: this.screen.getScale() });
  };

  addFullscreenBoundary = (isFullscreen?: boolean) => {
    if (isFullscreen) {
      this.screen?.addFullscreenBoundary();
    } else {
      this.screen?.addMobileStyles();
    }
  };

  clean() {
    this.abortController.abort();
    window.removeEventListener('resize', this.onWindowResize);
    this.resizeListening = false;
    this.messageLoader.clean();
    super.clean();
    this.screen?.clean();
    // @ts-ignore
    this.screen = undefined;
    // @ts-ignore
    this.messageManager = undefined;
  }
}

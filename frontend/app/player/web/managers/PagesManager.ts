import logger from 'App/logger';
import ListWalker from '../../common/ListWalker';

import { Message, MType } from '../messages';

import type Screen from '../Screen/Screen';
import DOMManager from './DOM/DOMManager';

export default class PagesManager extends ListWalker<DOMManager> {
  private currentPage: DOMManager | null = null;

  /**
   * String Dictionary in tracker may be desync with CreateDocument (why???)
   * e.g. some StringDictionary and other messages before any 'CreateDocument' one
   * TODO: understand why and fix
   */
  private stringDicts: Record<number, string>[] = [{}];

  private globalDictionary: Map<string, string> = new Map();

  constructor(
    private screen: Screen,
    private isMobile: boolean,
    private setCssLoading: (flag: boolean) => void,
    private showVModeBadge: () => void,
  ) {
    super();
  }

  /*
		Assumed that messages added in a correct time sequence.
	*/
  falseOrder = false;
  virtualMode = false;
  setVirtualMode = (virtualMode: boolean) => {
    this.virtualMode = virtualMode;
  };

  appendMessage(m: Message): void {
    if ([MType.StringDict, MType.StringDictGlobal].includes(m.tp)) {
      this.globalDictionary.set(m.key, m.value);
      return;
    }
    if (m.tp === MType.StringDictDeprecated) {
      let currentDict = this.stringDicts[0];
      if (currentDict[m.key] !== undefined && currentDict[m.key] !== m.value) {
        this.falseOrder = true;
        this.stringDicts.unshift({});
        currentDict = this.stringDicts[0];
      }
      currentDict[m.key] = m.value;
      return;
    }
    if (m.tp === MType.CreateDocument) {
      if (!this.falseOrder) {
        this.stringDicts.unshift({});
      }
      super.append(
        new DOMManager({
          screen: this.screen,
          isMobile: this.isMobile,
          // TODO: this is a deprecated code on life support, remove it after 09.2025
          stringDict: this.stringDicts[0],
          time: m.time,
          setCssLoading: this.setCssLoading,
          globalDict: {
            get: (key: string) => this.globalDictionary.get(key),
            all: () => Object.fromEntries(this.globalDictionary),
          },
          virtualMode: this.virtualMode,
          showVModeBadge: this.showVModeBadge,
        }),
      );
      this.falseOrder = false;
    }
    if (this.last === null) {
      logger.warn('DOMMessage before any document created, skipping:', m);
      return;
    }

    this.last.append(m);
  }

  sortPages(comparator: (a: Message, b: Message) => number) {
    this.forEach((page) => page.sort(comparator));
  }

  public getNode(id: number) {
    return this.currentPage?.getNode(id);
  }

  spriteMapEl: SVGElement | null = null;

  injectSpriteMap = (spriteEl: SVGElement) => {
    this.spriteMapEl = spriteEl;
    this.refreshSprites();
  };

  refreshSprites = () => {
    const int = setInterval(() => {
      const potential = this.screen.document?.body.querySelector(
        '#OPENREPLAY_SPRITES_MAP',
      );
      if (potential) {
        potential.innerHTML = this.spriteMapEl!.innerHTML;
        clearInterval(int);
      }
    }, 250);
  };

  moveReady(t: number): Promise<void> {
    const requiredPage = this.moveGetLast(t);
    let changed = false;
    if (requiredPage != null) {
      this.currentPage?.clearSelectionManager();
      this.currentPage = requiredPage;
      this.currentPage.reset(); // Otherwise it won't apply create_document
      changed = true;
    }
    if (this.currentPage != null) {
      return this.currentPage.moveReady(t).then(() => {
        if (changed && this.spriteMapEl) {
          setTimeout(() => {
            this.refreshSprites();
          }, 0);
        }
      });
    }
    return Promise.resolve();
  }
}

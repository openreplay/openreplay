import logger from 'App/logger';

import type Screen from '../Screen/Screen';
import type { Message, StringDict } from '../messages';

import { MType} from '../messages';
import ListWalker from '../../common/ListWalker';
import DOMManager from './DOM/DOMManager'; 


export default class PagesManager extends ListWalker<DOMManager> {
	private currentPage: DOMManager | null = null
	/**
	 * String Dictionary in tracker may be desync with CreateDocument (why???) 
	 * e.g. some StringDictionary and other messages before any 'CreateDocument' one
	 * TODO: understand why and fix
	 */
	private currentStringDict: Record<number, string> = {}

	constructor(
		private screen: Screen,
		private isMobile: boolean,
		private setCssLoading: ConstructorParameters<typeof DOMManager>[3],
) { super() }

	/*
		Assumed that messages added in a correct time sequence.
	*/
	appendMessage(m: Message): void {
		if (m.tp === MType.StringDict) {
			if (this.currentStringDict[m.key] !== undefined) {
				this.currentStringDict = {} /* refresh stringDict */
			}
			this.currentStringDict[m.key] = m.value
			return
		}
		if (m.tp === MType.CreateDocument) {
			super.append(new DOMManager(this.screen, this.isMobile, this.currentStringDict, m.time, this.setCssLoading))
		}
		if (this.last === null) {
			logger.warn("DOMMessage before any document created, skipping:", m)
			return;
		}
		this.last.append(m)
	}

	sortPages(comparator: (a: Message, b: Message) => number) {
		this.forEach(page => page.sort(comparator))
	}

	moveReady(t: number): Promise<void> {
		const requiredPage = this.moveGetLast(t)
		if (requiredPage != null) {
			this.currentPage = requiredPage
			this.currentPage.reset() // Otherwise it won't apply create_document
		}
		if (this.currentPage != null) {
			return this.currentPage.moveReady(t)
		}
		return Promise.resolve()
	}

}
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
	private stringDicts: Record<number, string>[] = [{}]

	constructor(
		private screen: Screen,
		private isMobile: boolean,
		private setCssLoading: ConstructorParameters<typeof DOMManager>[4],
) { super() }

	/*
		Assumed that messages added in a correct time sequence.
	*/
	falseOrder = false
	appendMessage(m: Message): void {
		if (m.tp === MType.StringDict) {
			let currentDict = this.stringDicts[0]
			if (currentDict[m.key] !== undefined && currentDict[m.key] !== m.value) {
				this.falseOrder = true
				this.stringDicts.unshift({})
				currentDict = this.stringDicts[0]
			}
			currentDict[m.key] = m.value
			return
		}
		if (m.tp === MType.CreateDocument) {
			if (!this.falseOrder) {
				this.stringDicts.unshift({})
			}
			super.append(new DOMManager(this.screen, this.isMobile, this.stringDicts[0], m.time, this.setCssLoading))
			this.falseOrder = false
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

	public getNode(id: number) {
		return this.currentPage?.getNode(id)
	}

	moveReady(t: number): Promise<void> {
		const requiredPage = this.moveGetLast(t)
		if (requiredPage != null) {
			this.currentPage?.clearSelectionManager()
			this.currentPage = requiredPage
			this.currentPage.reset() // Otherwise it won't apply create_document
		}
		if (this.currentPage != null) {
			return this.currentPage.moveReady(t)
		}
		return Promise.resolve()
	}
}
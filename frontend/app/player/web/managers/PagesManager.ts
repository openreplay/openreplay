import type Screen from '../Screen/Screen';
import type { Message } from '../messages';
import type MessageManager from '../MessageManager';

import { MType } from '../messages';
import ListWalker from '../../common/ListWalker';
import DOMManager from './DOM/DOMManager'; 


export default class PagesManager extends ListWalker<DOMManager> {
	private currentPage: DOMManager | null = null

	constructor(
		private screen: Screen,
		private isMobile: boolean,
		private setCssLoading: ConstructorParameters<typeof DOMManager>[3],
) { super() }

	/*
		Assumed that messages added in a correct time sequence.
	*/
	appendMessage(m: Message): void {
		if (m.tp === MType.CreateDocument) {
			super.append(new DOMManager(this.screen, this.isMobile, m.time, this.setCssLoading))
		}
		if (this.last === null) {
			// Log wrong
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
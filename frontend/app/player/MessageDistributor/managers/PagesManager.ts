import type StatedScreen from '../StatedScreen';
import type { Message } from '../messages';

import ListWalker from './ListWalker';
import DOMManager from './DOM/DOMManager'; 


export default class PagesManager extends ListWalker<DOMManager> {
	private currentPage: DOMManager | null = null

	private isMobile: boolean;
	private screen: StatedScreen;

	constructor(screen: StatedScreen, isMobile: boolean) {
		super()
		this.screen = screen
		this.isMobile = isMobile
	}

	/*
		Assumed that messages added in a correct time sequence.
	*/
	appendMessage(m: Message): void {
		if (m.tp === "create_document") {
			super.append(new DOMManager(this.screen, this.isMobile, m.time))
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
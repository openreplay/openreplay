//@flow
import type StatedScreen from '../StatedScreen';
import type { Message } from '../messages';
import type { Timed } from '../Timed';

import ListWalker from './ListWalker';
import DOMManager from './DOMManager'; 

type TimedMessage = Timed & Message;

export default class PagesManager extends ListWalker<TimedMessage> {
	#currentPage: DOMManager;

	#isMobile: boolean;
	#screen: StatedScreen;

	constructor(screen: StatedScreen, isMobile: boolean): void {
		super();
		this.#screen = screen;
		this.#isMobile = isMobile;
	}

	/*
		Assumed that messages added in a correct time sequence.
	*/
	add(m: TimedMessage): void {
		if (m.tp === "create_document") {
			super.add(new DOMManager(this.#screen, this.#isMobile, m.time))
		}
		if (this.last === null) {
			// Log wrong
			return;
		}
		this.last.add(m);
	}

	sort(comparator) {
		this.forEach(page => page.sort(comparator))
	}

	moveReady(t: number): Promise<void> {
		const requiredPage = this.moveToLast(t);
		if (!!requiredPage) {
			this.#currentPage = requiredPage;
			this.#currentPage.reset(); // Otherwise it won't apply create_document
		}
		if (!!this.#currentPage) {
			return this.#currentPage.moveReady(t);
		}
		return Promise.resolve();
	}

}
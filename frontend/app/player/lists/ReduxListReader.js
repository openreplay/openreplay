import { applyChange, revertChange } from 'deep-diff';
import ListReader from './ListReader';

export default class ReduxListReader extends ListReader {
	#state = {};
	#finalStates = [];

	get _goToReturn() { 
		return {
			listNow: this.listNow,
			state: { ...this.#state },
		};
	}

	_onIncrement(item) {
		this._processRedux(item, true);
	}

	_onDecrement(item) {
		this._processRedux(item, false);
	}

	_processRedux(action, forward) {
		if (forward) {
			if (!!action.state) {
				this.#finalStates.push(this.#state);
				this.#state = JSON.parse(JSON.stringify(action.state)); // Deep clone :(
			} else {
        action.diff.forEach(d => {
        	try { 
        		applyChange(this.#state, d);
        	} catch (e) { 
        		//console.warn("Deepdiff error")
        	}
        });
			}
		} else {
			if (!!action.state) {
				this.#state = this.#finalStates.pop();
			} else {
				action.diff.forEach(d => {
					try { 
        		revertChange(this.#state, 1, d); // bad lib :( TODO: write our own diff
        	} catch (e) {
        		//console.warn("Deepdiff error")
        	}
        });
			}
		}
	}
}
// import { applyChange, revertChange } from 'deep-diff';
// import ListWalker from './ListWalker';
// import type { Redux } from '../messages';

// export default class ReduxStateManager extends ListWalker<Redux> {
// 	private state: Object = {}
// 	private finalStates: Object[] = []

// 	moveWasUpdated(time, index) {
// 		super.moveApply(
// 			time,
// 			this.onIncrement,
// 			this.onDecrement,
// 		)
// 	}

// 	onIncrement = (item) => {
// 		this.processRedux(item, true);
// 	}

// 	onDecrement = (item) => {
// 		this.processRedux(item, false);
// 	}

// 	private processRedux(action, forward) {
// 		if (forward) {
// 			if (!!action.state) {
// 				this.finalStates.push(this.state);
// 				this.state = JSON.parse(JSON.stringify(action.state)); // Deep clone :(
// 			} else {
//         action.diff.forEach(d => {
//         	try {
//         		applyChange(this.state, d);
//         	} catch (e) {
//         		//console.warn("Deepdiff error")
//         	}
//         });
// 			}
// 		} else {
// 			if (!!action.state) {
// 				this.state = this.finalStates.pop();
// 			} else {
// 				action.diff.forEach(d => {
// 					try {
//         		revertChange(this.state, 1, d); // bad lib :( TODO: write our own diff
//         	} catch (e) {
//         		//console.warn("Deepdiff error")
//         	}
//         });
// 			}
// 		}
// 	}
// }

import type { Timed } from './messages/timed';
import ListWalker from './ListWalker'


type CheckFn<T> = (t: T) => boolean


export default class ListWalkerWithMarks<T extends Timed> extends ListWalker<T> {
	private _markCountNow: number = 0
	constructor(private isMarked: CheckFn<T>, initialList?: T[]) {
		super(initialList)
	}
	protected moveNext() {
		const val = super.moveNext()
		if (val && this.isMarked(val)) {
			this._markCountNow++
		}
 		return val
	}	
	protected movePrev() {
		const val = super.movePrev()
		if (val && this.isMarked(val)) {
			this._markCountNow--
		}
 		return val
	}
	get markCountNow(): number {
		return this._markCountNow
	}

}
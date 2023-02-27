import type { Timed } from './types';
import ListWalker from './ListWalker'


type CheckFn<T> = (t: T) => boolean


export default class ListWalkerWithMarks<T extends Timed> extends ListWalker<T> {
	private _markCountNow: number = 0
	private _markCount: number = 0
	constructor(private isMarked: CheckFn<T>, initialList: T[] = []) {
		super(initialList)
		this._markCount = initialList.reduce((n, item) => isMarked(item) ? n+1 : n, 0)
	}

	append(item: T) {
		if (this.isMarked(item)) { this._markCount++ }
		super.append(item)
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
	get markedCountNow(): number {
		return this._markCountNow
	}
	get markedCount(): number {
		return this._markCount
	}

}
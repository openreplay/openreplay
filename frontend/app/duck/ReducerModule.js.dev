
redux -> other storage ::<<   Entities +  Lists + relations <|> methods:: crud.  request declaration -> request realisation with middleware  -< (uses) MODEL



!request declaration



action/request formatter => ReducerModule Fabrique =>


class ReducerModule {
	_ns = "common"
	_switch = {}
	_n = 0

	constructor(namespace) {
		this._ns = namespace
	}

	/** 
	Action: state => newState | { reduce: state, action => newState, creator: () => {objects to action} }
	*/
	actions(actns): this {
		Object.keys(actns).map(key => {
			const type = `${this._namespace}/${key.toUpperCase()}`;
			this._switch[ type ] = actns[ key ]; 
		});
		return this;
	}

	requests(reqsts): this {
		Object.keys(reqsts).map(key => {
			const type = `${this._namespace}/${key.toUpperCase()}`;
			this._switch[ type ] = actns[ key ]; 
		});
		return this;
	}

	get actionTypes() {

	}

	get actionCreators() {

	}

	get reducer() {
		return (state, action = {}) => {
			const reduce = this._switch[ action.type ];
			return reduce ? reduce(state, action) : state;
		}
	}
}
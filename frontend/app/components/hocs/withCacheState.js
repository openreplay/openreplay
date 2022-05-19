import React from 'react';
export default (propNames) => BaseComponent => class extends React.PureComponent {
	state = {
		obj: this.getObjFromProps(),
		changed: false,
	}

	getObjFromProps() {
		const obj = {}
		propNames.forEach(propName => {
			obj[ propName ] = this.props[ propName ] || null;
		});
		return obj;
	}

	componentDidUpdate(prevProps) {
		if (propNames.some(propName => prevProps[ propName ] !== this.props[ propName ])){
			this.setState({
				obj: this.getObjFromProps(),
				changed: false,
			})
		}
	}

	_onChange = ({ name, value, type, checked }) => {
		if ([ 'radio', 'checkbox' ].includes(type)) {
			this.edit(name, checked);
		} else {
			this.edit(name, value);
		}
	}

	onChange = ({ target }) => this._onChange(target)

	onChangeSemantic = (e, target) => this._onChange(target)

	edit = (name, value) => {		
		this.setState({
			obj: {
				...this.state.obj,
				[ name ]: value,
			},
			changed: true,
		});
	}

	update = (name, updateFunction = a => a) => {
		this.setState({
			obj: {
				...this.state.obj,
				[ name ]: updateFunction(this.state.obj[ name ]),
			},
			changed: true,
		});
	}

	render() {

		return (
			<BaseComponent 
				{ ...this.props } 
				onChange={ this.onChange } 
				onChangeSemantic={ this.onChangeSemantic }
				edit={ this.edit }
				update={ this.update }
				changed={ this.state.changed } 
				{ ...this.state.obj }
			/>
		);
	}
}
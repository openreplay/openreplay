import React from 'react';
export default title => BaseComponent => class extends React.Component {
	componentDidMount() {
		document.title = title			
	}
	render() {
		return <BaseComponent { ...this.props }/>
	}
}

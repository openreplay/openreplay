import React from 'react';
export default class ProfileInfo extends React.PureComponent {
	render() {
		const { 
			profile: {
				name,
				args,
				result,
			}
		} = this.props;

		return (
			<div className="px-6" >
				<h5 className="py-3">{"Arguments"}</h5>
				<ul className="color-gray-medium">
					{ args.split(',').map(arg => (
						<li> { `${ arg }` } </li>
					))}
				</ul>
				<h5 className="py-3" >{"Result"}</h5>
				<div className="color-gray-medium" >
					{ `${ result }` }
				</div>
			</div>
		);
	}
}
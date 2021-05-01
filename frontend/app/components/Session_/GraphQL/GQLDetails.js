import { JSONTree } from 'UI'
import cn from 'classnames';

export default class GQLDetails extends React.PureComponent {
	render() {
		const { 
			gql: {
				variables,
				response,
			},
		} = this.props;

		let jsonVars = undefined;
		let jsonResponse = undefined;
		try {
			jsonVars = JSON.parse(payload);
		} catch (e) {}
		try {
			jsonResponse = JSON.parse(response);
		} catch (e) {}
		return (
			<div className="ph-20" >
				<div className="divider"/>
				{ variables && variables !== "{}" &&
					<div>
						<div className="mt-6">
							<h5>{ 'Variables'}</h5>
							{ jsonVars === undefined 
								? <div className="ml-3"> { variables } </div>
								: <JSONTree src={ jsonVars } />
							}
						</div>
						<div className="divider"/>
					</div>
				}
				<div className="mt-6">
					<div className="flex justify-between items-start">
						<h5 className="mt-1 mr-1">{ 'Response' }</h5>
					</div>
					{ jsonResponse === undefined 
						? <div className="ml-3"> { response } </div>
						: <JSONTree src={ jsonResponse } />
					}
				</div>
			</div>
		);
	}
}
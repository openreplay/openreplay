import { JSONTree, Button } from 'UI'
import cn from 'classnames';

export default class GQLDetails extends React.PureComponent {
	render() {
		const { 
			gql: {
				variables,
				response,
				duration,
				operationKind,
				operationName,
			},
			nextClick,
			prevClick,
			first = false,
			last = false,
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
			<div className="px-4 pb-16">
				<h5 className="mb-2">{ 'Operation Name'}</h5>
				<div className={ cn('p-2 bg-gray-lightest rounded color-gray-darkest')}>{ operationName }</div>

				<div className="flex items-center mt-4">
					<div className="w-4/12">
						<div className="font-medium mb-2">Operation Kind</div>
						<div>{operationKind}</div>
					</div>
					<div className="w-4/12">
						<div className="font-medium mb-2">Duration</div>
						<div>{parseInt(duration)} ms</div>
					</div>					
				</div>	

				<div className="flex justify-between items-start mt-6">
					<h5 className="mt-1 mr-1">{ 'Response' }</h5>
				</div>
				<div style={{ height: 'calc(100vh - 314px)', overflowY: 'auto' }}>
					{ variables && variables !== "{}" &&
						<div>
							<div className="mt-2">
								<h5>{ 'Variables'}</h5>
								{ jsonVars === undefined 
									? <div className="ml-3"> { variables } </div>
									: <JSONTree src={ jsonVars } />
								}
							</div>
							<div className="divider"/>
						</div>
					}
					<div className="mt-3">
						{ jsonResponse === undefined 
							? <div className="ml-3"> { response } </div>
							: <JSONTree src={ jsonResponse } />
						}
					</div>
				</div>

				<div className="flex justify-between absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
					<Button primary plain onClick={prevClick} disabled={first}>
						Prev
					</Button>
					<Button primary plain onClick={nextClick} disabled={last}>
						Next
					</Button>
				</div>
			</div>
		);
	}
}
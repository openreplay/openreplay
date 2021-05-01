import { JSONTree, Label, Button, Tabs } from 'UI'
import cn from 'classnames';
import copy from 'copy-to-clipboard';
import stl from './fetchDetails.css';
import ResultTimings from '../../shared/ResultTimings/ResultTimings';

const REQUEST = 'REQUEST';
const RESPONSE = 'RESPONSE';
const TIMINGS = 'TIMINGS';

const TABS = [ REQUEST, RESPONSE, TIMINGS ].map(tab => ({ text: tab, key: tab }));

export default class FetchDetails extends React.PureComponent {
	state = { activeTab: REQUEST, tabs: [] };

	onTabClick = activeTab => this.setState({ activeTab })

	componentDidMount() {
		this.checkTabs();
	}

	renderActiveTab = tab => {
		const { resource: { duration, timings }, isResult } = this.props;
		switch(tab) {
			case REQUEST:
				const { resource: { payload } } = this.props;
				let jsonPayload = undefined;
				try {
					jsonPayload = typeof payload === 'string' ? JSON.parse(payload) : payload
				} catch (e) {}
				
				return !!payload ? (
					<div>
						<div className="mt-6">
							{/* <h5>{ 'Payload '}</h5> */}
							{ jsonPayload === undefined 
								? <div className="ml-3 break-words my-3"> { payload } </div>
								: <JSONTree src={ jsonPayload } collapsed={ false } enableClipboard />
							}
						</div>
						<div className="divider"/>
					</div>
				) : ''
				break;
			case RESPONSE:
				const { resource: { response = this.props.resource.body } } = this.props; // for IOS compat.
				let jsonResponse = undefined;
				try {
					jsonResponse = JSON.parse(response);
				} catch (e) {}
								
				return !!response ? (
					<div>
						<div className="mt-6">
							{/* <h5>{ 'Response '}</h5> */}
							{ jsonResponse === undefined 
								? <div className="ml-3 break-words my-3"> { response } </div>
								: <JSONTree src={ jsonResponse } collapsed={ false } enableClipboard />
							}
						</div>
						<div className="divider"/>
					</div>
					// jsonResponse === undefined 
					// 	? <div className="ml-3 break-words my-3"> { response } </div>
					// 	: <JSONTree src={ jsonResponse } collapsed={ false } enableClipboard />
				) : ''
				break;
			case TIMINGS:
				return <ResultTimings duration={duration} timing={timings} />
		}
	}

	componentDidUpdate(prevProps) {
		if (prevProps.resource.index === this.props.resource.index) return;
		
		this.checkTabs();
	}

	checkTabs() {
		const { resource: { payload, response, body }, isResult } = this.props;	
		const _tabs = TABS.filter(t => {
			if (t.key == REQUEST && !!payload) {
				return true
			}

			if (t.key == RESPONSE && !!response) {
				return true;
			}

			if (t.key == TIMINGS && isResult) {
				return true;
			}

			return false;
		})
		this.setState({ tabs: _tabs, activeTab: _tabs.length > 0 ? _tabs[0].key : null })
	}

	render() {
		const { 
			resource: {
				method,
				url,
				duration
			},
			nextClick,
			prevClick,
			first = false,
			last = false,
		} = this.props;
		const { activeTab, tabs } = this.state;

		return (
			<div className="px-4 pb-16">
				<h5 className="mb-2">{ 'URL'}</h5>
				<div className={ cn(stl.url, 'color-gray-darkest')}>{ url }</div>
				<div className="flex items-center mt-4">
					<div className="w-4/12">
						<div className="font-medium mb-2">Method</div>
						<div>{method}</div>
					</div>
					<div className="w-4/12">
						<div className="font-medium mb-2">Duration</div>
						<div>{parseInt(duration)} ms</div>
					</div>					
				</div>				

				<div className="mt-6">
					<div>
						<Tabs 
              tabs={ tabs }
              active={ activeTab }
              onClick={ this.onTabClick }
              border={ true }
            />
						<div style={{ height: 'calc(100vh - 314px)', overflowY: 'auto' }}>
							{ this.renderActiveTab(activeTab) }
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
			</div>
		);
	}
}
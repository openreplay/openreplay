import { JSONTree, NoContent, Button, Tabs } from 'UI'
import cn from 'classnames';
import copy from 'copy-to-clipboard';
import stl from './fetchDetails.css';
import Headers from './components/Headers'

const HEADERS = 'HEADERS';
const REQUEST = 'REQUEST';
const RESPONSE = 'RESPONSE';

const TABS = [ HEADERS, REQUEST, RESPONSE ].map(tab => ({ text: tab, key: tab }));

export default class FetchDetails extends React.PureComponent {
	state = { activeTab: REQUEST, tabs: [] };

	onTabClick = activeTab => this.setState({ activeTab })

	componentDidMount() {
		this.checkTabs();
	}

	renderActiveTab = tab => {
		const { resource: { payload, response = this.props.resource.body} } = this.props;
    let jsonPayload, jsonResponse, requestHeaders, responseHeaders = undefined;

    try {
      jsonPayload = typeof payload === 'string' ? JSON.parse(payload) : payload
      requestHeaders = jsonPayload.headers
      jsonPayload.body = typeof jsonPayload.body === 'string' ? JSON.parse(jsonPayload.body) : jsonPayload.body
      delete jsonPayload.headers
    } catch (e) {}

    try {
      jsonResponse = typeof response === 'string' ? JSON.parse(response) : response;
      responseHeaders = jsonResponse.headers
      jsonResponse.body = typeof jsonResponse.body === 'string' ? JSON.parse(jsonResponse.body) : jsonResponse.body
      delete jsonResponse.headers
    } catch (e) {}
    
		switch(tab) {
			case REQUEST:
				return (
          <NoContent
            title="Body is Empty."
            size="small"
            show={ !payload }
            icon="exclamation-circle"
          >
            <div>
              <div className="mt-6">
                { jsonPayload === undefined 
                  ? <div className="ml-3 break-words my-3"> { payload } </div>
                  : <JSONTree src={ jsonPayload } collapsed={ false } enableClipboard />
                }
              </div>
              <div className="divider"/>
            </div>
          </NoContent>
        )
			case RESPONSE:
				return (
          <NoContent
            title="Body is Empty."
            size="small"
            show={ !response }
            icon="exclamation-circle"
          >
            <div>
              <div className="mt-6">
                { jsonResponse === undefined 
                  ? <div className="ml-3 break-words my-3"> { response } </div>
                  : <JSONTree src={ jsonResponse } collapsed={ false } enableClipboard />
                }
              </div>
              <div className="divider"/>
            </div>
          </NoContent>
        )
      case HEADERS:
        return <Headers requestHeaders={requestHeaders} responseHeaders={responseHeaders} />
		}
	}

	componentDidUpdate(prevProps) {
		if (prevProps.resource.index === this.props.resource.index) return;
		
		this.checkTabs();
	}

	checkTabs() {
		const { resource: { payload, response, body }, isResult } = this.props;	
    const _tabs = TABS
		// const _tabs = TABS.filter(t => {
		// 	if (t.key == REQUEST && !!payload) {
		// 		return true
		// 	}

		// 	if (t.key == RESPONSE && !!response) {
		// 		return true;
		// 	}

		// 	return false;
		// })
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
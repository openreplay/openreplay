import React from 'react';
import { JSONTree, NoContent, Button, Tabs, Icon } from 'UI';
import cn from 'classnames';
import stl from './fetchDetails.module.css';
import Headers from './components/Headers';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { TYPES } from 'Types/session/resource';
import { formatBytes } from 'App/utils';

const HEADERS = 'HEADERS';
const REQUEST = 'REQUEST';
const RESPONSE = 'RESPONSE';

const TABS = [HEADERS, REQUEST, RESPONSE].map((tab) => ({ text: tab, key: tab }));

export default class FetchDetailsModal extends React.PureComponent {
  state = { activeTab: REQUEST, tabs: [] };

  onTabClick = (activeTab) => this.setState({ activeTab });

  componentDidMount() {
    this.checkTabs();
  }

  renderActiveTab = (tab) => {
    const {
      resource: { payload, response = this.props.resource.body },
    } = this.props;
    let jsonPayload,
      jsonResponse,
      requestHeaders,
      responseHeaders = undefined;

    try {
      jsonPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      requestHeaders = jsonPayload.headers;
      jsonPayload.body =
        typeof jsonPayload.body === 'string' ? JSON.parse(jsonPayload.body) : jsonPayload.body;
      delete jsonPayload.headers;
    } catch (e) {}

    try {
      jsonResponse = typeof response === 'string' ? JSON.parse(response) : response;
      responseHeaders = jsonResponse.headers;
      jsonResponse.body =
        typeof jsonResponse.body === 'string' ? JSON.parse(jsonResponse.body) : jsonResponse.body;
      delete jsonResponse.headers;
    } catch (e) {}

    switch (tab) {
      case REQUEST:
        return (
          <NoContent
            title={
              <div className="flex flex-col items-center justify-center">
                <AnimatedSVG name={ICONS.NO_RESULTS} size="170" />
                <div className="mt-6 text-2xl">Body is Empty.</div>
              </div>
            }
            size="small"
            show={!payload}
            // animatedIcon="no-results"
          >
            <div>
              <div className="mt-6">
                {jsonPayload === undefined ? (
                  <div className="ml-3 break-words my-3"> {payload} </div>
                ) : (
                  <JSONTree src={jsonPayload} collapsed={false} enableClipboard />
                )}
              </div>
              <div className="divider" />
            </div>
          </NoContent>
        );
      case RESPONSE:
        return (
          <NoContent
            title={
              <div className="flex flex-col items-center justify-center">
                <AnimatedSVG name={ICONS.NO_RESULTS} size="170" />
                <div className="mt-6 text-2xl">Body is Empty.</div>
              </div>
            }
            size="small"
            show={!response}
            // animatedIcon="no-results"
          >
            <div>
              <div className="mt-6">
                {jsonResponse === undefined ? (
                  <div className="ml-3 break-words my-3"> {response} </div>
                ) : (
                  <JSONTree src={jsonResponse} collapsed={false} enableClipboard />
                )}
              </div>
              <div className="divider" />
            </div>
          </NoContent>
        );
      case HEADERS:
        return <Headers requestHeaders={requestHeaders} responseHeaders={responseHeaders} />;
    }
  };

  componentDidUpdate(prevProps) {
    if (prevProps.resource.index === this.props.resource.index) return;

    this.checkTabs();
  }

  checkTabs() {
    const {
      resource: { payload, response, body },
      isResult,
    } = this.props;
    const _tabs = TABS;
    // const _tabs = TABS.filter(t => {
    // 	if (t.key == REQUEST && !!payload) {
    // 		return true
    // 	}

    // 	if (t.key == RESPONSE && !!response) {
    // 		return true;
    // 	}

    // 	return false;
    // })
    this.setState({ tabs: _tabs, activeTab: _tabs.length > 0 ? _tabs[0].key : null });
  }

  render() {
    const {
      resource,
      fetchPresented,
      nextClick,
      prevClick,
      first = false,
      last = false,
    } = this.props;
    const { method, url, duration } = resource;
    const { activeTab, tabs } = this.state;
    const _duration = parseInt(duration);

    return (
      <div className="bg-white p-5 h-screen overflow-y-auto" style={{ width: '500px' }}>
        <h5 className="mb-2 text-2xl">Network Request</h5>
        <div className="flex items-center py-1">
          <div className="font-medium">Name</div>
          <div className="rounded-lg bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip">
            {resource.name}
          </div>
        </div>

        <div className="flex items-center py-1">
          <div className="font-medium">Type</div>
          <div className="rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip">
            {resource.type}
          </div>
        </div>

        {!!resource.decodedBodySize && (
          <div className="flex items-center py-1">
            <div className="font-medium">Size</div>
            <div className="rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip">
              {formatBytes(resource.decodedBodySize)}
            </div>
          </div>
        )}

        {method && (
          <div className="flex items-center py-1">
            <div className="font-medium">Request Method</div>
            <div className="rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip">
              {resource.method}
            </div>
          </div>
        )}

        {resource.status && (
          <div className="flex items-center py-1">
            <div className="font-medium">Status</div>
            <div className="rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip flex items-center">
              {resource.status === '200' && (
                <div className="w-4 h-4 bg-green rounded-full mr-2"></div>
              )}
              {resource.status}
            </div>
          </div>
        )}

        {!!_duration && (
          <div className="flex items-center py-1">
            <div className="font-medium">Time</div>
            <div className="rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip">
              {_duration} ms
            </div>
          </div>
        )}

        {resource.type === TYPES.XHR && !fetchPresented && (
          <div className="bg-active-blue rounded p-3 mt-4">
            <div className="mb-2 flex items-center">
              <Icon name="lightbulb" size="18" />
              <span className="ml-2 font-medium">Get more out of network requests</span>
            </div>
            <ul className="list-disc ml-5">
              <li>
                Integrate{' '}
                <a href="https://docs.openreplay.com/plugins/fetch" className="link" target="_blank">
                  Fetch plugin
                </a>{' '}
                to capture fetch payloads.
              </li>
              <li>
                Find a detailed{' '}
                <a href="https://www.youtube.com/watch?v=YFCKstPZzZg" className="link" target="_blank">
                  video tutorial
                </a>{' '}
                to understand practical example of how to use fetch plugin.
              </li>
            </ul>
          </div>
        )}

        <div className="mt-6">
          {resource.type === TYPES.XHR && fetchPresented && (
            <div>
              <Tabs tabs={tabs} active={activeTab} onClick={this.onTabClick} border={true} />
              <div style={{ height: 'calc(100vh - 314px)', overflowY: 'auto' }}>
                {this.renderActiveTab(activeTab)}
              </div>
            </div>
          )}

          {/* <div className="flex justify-between absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
            <Button variant="outline" onClick={prevClick} disabled={first}>
              Prev
            </Button>
            <Button variant="outline" onClick={nextClick} disabled={last}>
              Next
            </Button>
          </div> */}
        </div>
      </div>
    );
  }
}

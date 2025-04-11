import React from 'react';
import { getIn, get } from 'immutable';
import cn from 'classnames';
import { withRequest } from 'HOCs';
import { Loader, Icon, JSONTree } from 'UI';
import { Collapse } from 'antd';
import stl from './sentry.module.css';

const { Panel } = Collapse;

@withRequest({
  endpoint: (props) => `/integrations/sentry/events/${props.event.id}`,
  dataName: 'detailedEvent',
  loadOnInitialize: true,
})
export default class SentryEventInfo extends React.PureComponent {
  makePanelsFromStackTrace(stacktrace) {
    return get(stacktrace, 'frames', []).map(
      ({ filename, function: method, lineNo, context = [] }) => ({
        key: `${filename}_${method}_${lineNo}`,
        header: (
          <span className={stl.accordionTitle}>
            <b>{filename}</b>
            {' in '}
            <b>{method}</b>
            {' at line '}
            <b>{lineNo}</b>
          </span>
        ),
        content: (
          <ol start={getIn(context, [0, 0], 0)} className={stl.lineList}>
            {context.map(([ctxLineNo, codeText]) => (
              <li
                key={ctxLineNo}
                className={cn(stl.codeLine, {
                  [stl.highlighted]: ctxLineNo === lineNo,
                })}
              >
                {codeText}
              </li>
            ))}
          </ol>
        ),
      }),
    );
  }

  renderBody() {
    const { detailedEvent, requestError, event } = this.props;

    const exceptionEntry = get(detailedEvent, ['entries'], []).find(
      ({ type }) => type === 'exception',
    );
    const stacktraces = getIn(exceptionEntry, ['data', 'values']);
    if (!stacktraces) {
      return (
        <JSONTree
          src={requestError ? event : detailedEvent}
          sortKeys={false}
          enableClipboard
        />
      );
    }
    return stacktraces.map(({ type, value, stacktrace }) => (
      <div key={type} className={stl.stacktrace}>
        <h6>{type}</h6>
        <p>{value}</p>
        <Collapse accordion>
          {this.makePanelsFromStackTrace(stacktrace).map((panel) => (
            <Panel key={panel.key} header={panel.header}>
              {panel.content}
            </Panel>
          ))}
        </Collapse>
      </div>
    ));
  }

  render() {
    const { open, toggleOpen, loading } = this.props;
    return (
      <div className={stl.wrapper}>
        <Icon
          className={stl.icon}
          name="integrations/sentry-text"
          height="25"
          width="70"
          color="gray-medium"
        />
        <Loader loading={loading}>{this.renderBody()}</Loader>
      </div>
    );
  }
}

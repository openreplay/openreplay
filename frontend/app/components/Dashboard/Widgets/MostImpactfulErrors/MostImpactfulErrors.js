import React from 'react';
import { connect } from 'react-redux';
import withSiteIdRouter from 'HOCs/withSiteIdRouter';
import { Loader, NoContent } from 'UI';
import { addEvent } from 'Duck/filters';
import { TYPES } from 'Types/filter/event';
import { sessions } from 'App/routes';
import { Table, widgetHOC } from '../common';
import Chart from './Chart';
import ErrorInfo from './ErrorInfo';

const cols = [
  {
    key: 'error',
    title: 'Error Info',
    Component: ErrorInfo,
    width: '80%',
  },
  {
    key: 'trend',
    title: 'Trend',
    Component: Chart,
    width: '10%',
  },
  {
    key: 'sessions',
    title: 'Sessions',
    toText: count => `${ count > 1000 ? Math.trunc(count / 1000) : count }${ count > 1000 ? 'k' : '' }`,
    width: '10%',
  },
];

@withSiteIdRouter
@widgetHOC('errorsTrend', { fullwidth: true })
@connect(null, { addEvent })
export default class MostImpactfulErrors extends React.PureComponent {
  findJourneys = (error) => {
    this.props.addEvent({
      type: TYPES.CONSOLE,
      value: error,
    }, true);
    this.props.history.push(sessions());
  }

  render() {
    const { data: errors, loading } = this.props;
    return (
      <Loader loading={ loading } size="small">
        <NoContent
          size="small"
          title="No recordings found"
          show={ errors.size === 0 }
        >
          <Table
            cols={ cols }
            rows={ errors }
            rowProps={ { findJourneys: this.findJourneys } }
            isTemplate={this.props.isTemplate}
          />
        </NoContent>
      </Loader>
    );
  }
}

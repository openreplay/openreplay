import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import withSiteIdRouter from 'HOCs/withSiteIdRouter';
import { ErrorDetails, IconButton, Icon, Loader, Button } from 'UI';
import { sessions as sessionsRoute } from 'App/routes';
import { TYPES as EV_FILER_TYPES } from 'Types/filter/event';
import { UNRESOLVED, RESOLVED, IGNORED } from 'Types/errorInfo';
import { addFilterByKeyAndValue } from 'Duck/search';
import { resolve, unresolve, ignore, toggleFavorite } from 'Duck/errors';
import { resentOrDate } from 'App/date';
import Divider from 'Components/Errors/ui/Divider';
import ErrorName from 'Components/Errors/ui/ErrorName';
import Label from 'Components/Errors/ui/Label';
import SharePopup from 'Shared/SharePopup';
import { FilterKey } from 'Types/filter/filterType';

import SessionBar from './SessionBar';

@withSiteIdRouter
@connect(
  (state) => ({
    error: state.getIn(['errors', 'instance']),
    trace: state.getIn(['errors', 'instanceTrace']),
    sourcemapUploaded: state.getIn(['errors', 'sourcemapUploaded']),
    resolveToggleLoading:
      state.getIn(['errors', 'resolve', 'loading']) ||
      state.getIn(['errors', 'unresolve', 'loading']),
    ignoreLoading: state.getIn(['errors', 'ignore', 'loading']),
    toggleFavoriteLoading: state.getIn(['errors', 'toggleFavorite', 'loading']),
    traceLoading: state.getIn(['errors', 'fetchTrace', 'loading']),
  }),
  {
    resolve,
    unresolve,
    ignore,
    toggleFavorite,
    addFilterByKeyAndValue,
  }
)
export default class MainSection extends React.PureComponent {
  resolve = () => {
    const { error } = this.props;
    this.props.resolve(error.errorId);
  };

  unresolve = () => {
    const { error } = this.props;
    this.props.unresolve(error.errorId);
  };

  ignore = () => {
    const { error } = this.props;
    this.props.ignore(error.errorId);
  };
  bookmark = () => {
    const { error } = this.props;
    this.props.toggleFavorite(error.errorId);
  };

  findSessions = () => {
    this.props.addFilterByKeyAndValue(FilterKey.ERROR, this.props.error.message);
    this.props.history.push(sessionsRoute());
  };

  render() {
    const {
      error,
      trace,
      sourcemapUploaded,
      ignoreLoading,
      resolveToggleLoading,
      toggleFavoriteLoading,
      className,
      traceLoading,
    } = this.props;
    const isPlayer = window.location.pathname.includes('/session/');

    return (
      <div className={cn(className, 'bg-white border-radius-3 thin-gray-border mb-6')}>
        <div className="m-4">
          <ErrorName
            className="text-lg leading-relaxed"
            name={error.name}
            message={error.stack0InfoString}
            lineThrough={error.status === RESOLVED}
          />
          <div className="flex flex-col">
            <div
              className="flex items-center color-gray-dark font-semibold"
              style={{ wordBreak: 'break-all' }}
            >
              {error.message}
            </div>
            <div className="flex items-center mt-2">
              <div className="flex">
                <Label
                  topValue={error.sessions}
                  horizontal
                  topValueSize="text-lg"
                  bottomValue="Sessions"
                />
                <Label
                  topValue={error.users}
                  horizontal
                  topValueSize="text-lg"
                  bottomValue="Users"
                />
              </div>
              <div className="text-xs color-gray-medium">Over the past 30 days</div>
            </div>
          </div>
        </div>

        <Divider />
        <div className="m-4">
          <div className="flex items-center">
            <h3 className="text-xl inline-block mr-2">Last session with this error</h3>
            <span className="font-thin text-sm">{resentOrDate(error.lastOccurrence)}</span>
            <Button className="ml-auto" variant="text-primary" onClick={this.findSessions}>
              Find all sessions with this error
              <Icon className="ml-1" name="next1" color="teal" />
            </Button>
          </div>
          <SessionBar className="my-4" session={error.lastHydratedSession} />
          {error.customTags ? (
            <div className="flex items-start flex-col">
              <div>
                <span className="font-semibold">More Info</span> <span className="text-disabled-text">(most recent call)</span>
              </div>
              <div className="mt-4 flex items-center gap-3 w-full flex-wrap">
              {error.customTags.map((tag) => (
                <div className="flex items-center rounded overflow-hidden bg-gray-lightest">
                  <div className="bg-gray-light-shade py-1 px-2 text-disabled-text">{Object.entries(tag)[0][0]}</div> <div className="py-1 px-2 text-gray-dark">{Object.entries(tag)[0][1]}</div>
                </div>
              ))}
              </div>
            </div>
          ) : null}
        </div>
        <Divider />
        <div className="m-4">
          <Loader loading={traceLoading}>
            <ErrorDetails
              name={error.name}
              message={error.message}
              errorStack={trace}
              error={error}
              sourcemapUploaded={sourcemapUploaded}
            />
          </Loader>
        </div>
      </div>
    );
  }
}

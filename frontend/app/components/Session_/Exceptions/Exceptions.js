import React from 'react';
import { connect } from 'react-redux';
import { getRE } from 'App/utils';
import {
  NoContent,
  Loader,
  Input,
  ErrorItem,
  SlideModal,
  ErrorDetails,
  ErrorHeader,
  Link,
  QuestionMarkHint,
  Tabs,
} from 'UI';
import { fetchErrorStackList } from 'Duck/sessions';
import { connectPlayer, jump } from 'Player';
import { error as errorRoute } from 'App/routes';
import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock';

@connectPlayer((state) => ({
  logs: state.logListNow,
  exceptions: state.exceptionsList,
  // exceptionsNow: state.exceptionsListNow,
}))
@connect(
  (state) => ({
    session: state.getIn(['sessions', 'current']),
    errorStack: state.getIn(['sessions', 'errorStack']),
    sourcemapUploaded: state.getIn(['sessions', 'sourcemapUploaded']),
    loading: state.getIn(['sessions', 'fetchErrorStackList', 'loading']),
  }),
  { fetchErrorStackList }
)
export default class Exceptions extends React.PureComponent {
  state = {
    filter: '',
    currentError: null,
  };

  onFilterChange = ({ target: { value } }) => this.setState({ filter: value });

  setCurrentError = (err) => {
    const { session } = this.props;
    this.props.fetchErrorStackList(session.sessionId, err.errorId);
    this.setState({ currentError: err });
  };
  closeModal = () => this.setState({ currentError: null });

  render() {
    const { exceptions, loading, errorStack, sourcemapUploaded } = this.props;
    const { filter, currentError } = this.state;
    const filterRE = getRE(filter, 'i');

    const filtered = exceptions.filter((e) => filterRE.test(e.name) || filterRE.test(e.message));

    // let lastIndex = -1;
    // filtered.forEach((item, index) => {
    //   if (
    //     this.props.exceptionsNow.length > 0 &&
    //     item.time <= this.props.exceptionsNow[this.props.exceptionsNow.length - 1].time
    //   ) {
    //     lastIndex = index;
    //   }
    // });

    return (
      <>
        <SlideModal
          title={
            currentError && (
              <div className="mb-4">
                <div className="text-xl mb-2">
                  <Link to={errorRoute(currentError.errorId)}>
                    <span className="font-bold">{currentError.name}</span>
                  </Link>
                  <span className="ml-2 text-sm color-gray-medium">{currentError.function}</span>
                </div>
                <div>{currentError.message}</div>
              </div>
            )
          }
          isDisplayed={currentError != null}
          content={
            currentError && (
              <div className="px-4">
                <Loader loading={loading}>
                  <NoContent show={!loading && errorStack.size === 0} title="Nothing found!">
                    <ErrorDetails
                      error={currentError}
                      errorStack={errorStack}
                      sourcemapUploaded={sourcemapUploaded}
                    />
                  </NoContent>
                </Loader>
              </div>
            )
          }
          onClose={this.closeModal}
        />
        <BottomBlock>
          <BottomBlock.Header>
            <div className="flex items-center">
              <span className="font-semibold color-gray-medium mr-4">Exceptions</span>
            </div>

            <div className={'flex items-center justify-between'}>
              <Input
                className="input-small"
                placeholder="Filter by name or message"
                icon="search"
                iconPosition="left"
                name="filter"
                onChange={this.onFilterChange}
                height={28}
              />
              <QuestionMarkHint
                className={'mx-4'}
                content={
                  <>
                    <a
                      className="color-teal underline"
                      target="_blank"
                      href="https://docs.openreplay.com/installation/upload-sourcemaps"
                    >
                      Upload Source Maps{' '}
                    </a>
                    and see source code context obtained from stack traces in their original form.
                  </>
                }
              />
            </div>
          </BottomBlock.Header>
          <BottomBlock.Content>
            <NoContent size="small" show={filtered.length === 0} title="No recordings found">
              <Autoscroll>
                {filtered.map((e, index) => (
                  <ErrorItem
                    onJump={() => jump(e.time)}
                    error={e}
                    key={e.key}
                    // selected={lastIndex === index}
                    // inactive={index > lastIndex}
                    onErrorClick={(jsEvent) => {
                      jsEvent.stopPropagation();
                      jsEvent.preventDefault();
                      this.setCurrentError(e);
                    }}
                  />
                ))}
              </Autoscroll>
            </NoContent>
          </BottomBlock.Content>
        </BottomBlock>
      </>
    );
  }
}

import { error as errorRoute } from 'App/routes';
import JsonViewer from 'Components/Session_/StackEvents/UserEvent/JsonViewer';
import Sentry from 'Components/Session_/StackEvents/UserEvent/Sentry';
import { hideHint } from 'Duck/components/player';
import withEnumToggle from 'HOCs/withEnumToggle';
import { connectPlayer, jump } from 'Player';
import React from 'react';
import { connect } from 'react-redux';
import { DATADOG, SENTRY, STACKDRIVER, typeList } from 'Types/session/stackEvent';
import { NoContent, SlideModal, Tabs, Link } from 'UI';
import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock';
import UserEvent from './UserEvent';

const ALL = 'ALL';

const TABS = [ALL, ...typeList].map((tab) => ({ text: tab, key: tab }));

@withEnumToggle('activeTab', 'setActiveTab', ALL)
@connectPlayer((state) => ({
  stackEvents: state.stackList,
  stackEventsNow: state.stackListNow,
}))
@connect(
  (state) => ({
    hintIsHidden:
      state.getIn(['components', 'player', 'hiddenHints', 'stack']) ||
      !state.getIn(['site', 'list']).some((s) => s.stackIntegrations),
  }),
  {
    hideHint,
  }
)
export default class StackEvents extends React.PureComponent {
  //  onFilterChange = (e, { value }) => this.setState({ filter: value })

  state = {
    currentEvent: null,
  };

  onDetailsClick(userEvent) {
    this.setState({ currentEvent: userEvent });
  }

  closeModal() {
    this.setState({ currentEvent: undefined });
  }

  renderPopupContent(userEvent) {
    const { source, payload, name } = userEvent;
    switch (source) {
      case SENTRY:
        return <Sentry event={payload} />;
      case DATADOG:
        return <JsonViewer title={name} data={payload} icon="integrations/datadog" />;
      case STACKDRIVER:
        return <JsonViewer title={name} data={payload} icon="integrations/stackdriver" />;
      default:
        return <JsonViewer title={name} data={payload} icon={`integrations/${source}`} />;
    }
  }

  render() {
    const { stackEvents, activeTab, setActiveTab, hintIsHidden } = this.props;
    //const filterRE = new RegExp(filter, 'i');
    const { currentEvent } = this.state;

    const tabs = TABS.filter(
      ({ key }) => key === ALL || stackEvents.some(({ source }) => key === source)
    );

    const filteredStackEvents = stackEvents
      //      .filter(({ data }) => data.includes(filter))
      .filter(({ source }) => activeTab === ALL || activeTab === source);

    let lastIndex = -1;
    // TODO: Need to do filtering in store, or preferably in a selector
    filteredStackEvents.forEach((item, index) => {
      if (
        this.props.stackEventsNow.length > 0 &&
        item.time <= this.props.stackEventsNow[this.props.stackEventsNow.length - 1].time
      ) {
        lastIndex = index;
      }
    });

    return (
      <>
        <SlideModal
          title={
            currentEvent && (
              <div className="mb-4">
                <div className="text-xl mb-2">
                  <Link to={errorRoute(currentEvent.errorId)}>
                    <span className="font-bold">{currentEvent.name}</span>
                  </Link>
                  <span className="ml-2 text-sm color-gray-medium">{currentEvent.function}</span>
                </div>
                <div>{currentEvent.message}</div>
              </div>
            )
          }
          isDisplayed={currentEvent != null}
          content={
            currentEvent && <div className="px-4">{this.renderPopupContent(currentEvent)}</div>
          }
          onClose={this.closeModal.bind(this)}
        />
        <BottomBlock>
          <BottomBlock.Header>
            <div className="flex items-center">
              <span className="font-semibold color-gray-medium mr-4">Events</span>
              <Tabs
                className="uppercase"
                tabs={tabs}
                active={activeTab}
                onClick={setActiveTab}
                border={false}
              />
            </div>
          </BottomBlock.Header>
          <BottomBlock.Content>
            <NoContent
              title="Nothing to display yet."
              subtext={
                !hintIsHidden ? (
                  <>
                    <a
                      className="underline color-teal"
                      href="https://docs.openreplay.com/integrations"
                      target="_blank"
                    >
                      Integrations
                    </a>
                    {' and '}
                    <a
                      className="underline color-teal"
                      href="https://docs.openreplay.com/api#event"
                      target="_blank"
                    >
                      Events
                    </a>
                    {
                      ' make debugging easier. Sync your backend logs and custom events with session replay.'
                    }
                    <br />
                    <br />
                    <button className="color-teal" onClick={() => this.props.hideHint('stack')}>
                      Got It!
                    </button>
                  </>
                ) : null
              }
              size="small"
              show={filteredStackEvents.length === 0}
            >
              <Autoscroll autoScrollTo={Math.max(lastIndex, 0)}>
                {filteredStackEvents.map((userEvent, index) => (
                  <UserEvent
                    key={userEvent.key}
                    onDetailsClick={this.onDetailsClick.bind(this)}
                    inactive={index > lastIndex}
                    selected={lastIndex === index}
                    userEvent={userEvent}
                    onJump={() => jump(userEvent.time)}
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

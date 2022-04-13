import { connect } from 'react-redux';
import { connectPlayer, jump } from 'Player';
import { NoContent, Tabs } from 'UI';
import withEnumToggle from 'HOCs/withEnumToggle';
import { hideHint } from 'Duck/components/player';
import { typeList } from 'Types/session/stackEvent'; 
import UserEvent from './UserEvent';
import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock';

const ALL = 'ALL';

const TABS = [ ALL, ...typeList ].map(tab =>({ text: tab, key: tab }));

@withEnumToggle('activeTab', 'setActiveTab', ALL)
@connectPlayer(state => ({
  stackEvents: state.stackList,
}))
@connect(state => ({
  hintIsHidden: state.getIn(['components', 'player', 'hiddenHints', 'stack']) || 
    !state.getIn([ 'site', 'list' ]).some(s => s.stackIntegrations),
}), {
  hideHint
})
export default class StackEvents extends React.PureComponent {
//  onFilterChange = (e, { value }) => this.setState({ filter: value })

  render() {
    const { stackEvents, activeTab, setActiveTab, hintIsHidden } = this.props;
    //const filterRE = new RegExp(filter, 'i');

    const tabs = TABS.filter(({ key }) => key === ALL || stackEvents.some(({ source }) => key === source));

    const filteredStackEvents = stackEvents
//      .filter(({ data }) => data.includes(filter))
      .filter(({ source }) => activeTab === ALL || activeTab === source);

    return (
      <BottomBlock>
        <BottomBlock.Header>
          <Tabs 
            className="uppercase"
            tabs={ tabs }
            active={ activeTab } 
            onClick={ setActiveTab }
            border={ false }
        />
        </BottomBlock.Header>
        <BottomBlock.Content>
          <NoContent
            title="Nothing to display yet."
            subtext={ !hintIsHidden 
              ? 
                <>
                  <a className="underline color-teal" href="https://docs.openreplay.com/integrations" target="_blank">Integrations</a>
                  {' and '}
                  <a className="underline color-teal" href="https://docs.openreplay.com/api#event" target="_blank">Events</a> 
                  { ' make debugging easier. Sync your backend logs and custom events with session replay.' }
                  <br/><br/>
                  <button className="color-teal" onClick={() => this.props.hideHint("stack")}>Got It!</button>
                </>
              : null
            }
            size="small"
            show={ filteredStackEvents.length === 0 }
          >
            <Autoscroll>
              { filteredStackEvents.map(userEvent => (
                <UserEvent
                  key={ userEvent.key }
                  userEvent={ userEvent }
                  onJump={ () => jump(userEvent.time) }
                />
              ))}
            </Autoscroll>
          </NoContent>
        </BottomBlock.Content>
      </BottomBlock>
    );
  }
}
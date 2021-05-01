import { connectPlayer } from 'Player';
import { Icon, SlideModal, TextEllipsis, Input } from 'UI';
import { getRE } from 'App/utils';

import ProfileInfo from './ProfileInfo';
import TimeTable from '../TimeTable';
import BottomBlock from '../BottomBlock';

const renderDuration = p => `${ p.duration }ms`;
const renderName = p => <TextEllipsis text={ p.name } />;

@connectPlayer(state => ({
  profiles: state.profilesList,
}))
export default class Profiler extends React.PureComponent {
  state = {
    filter: '',
    modalProfile: null,
  }
  onFilterChange = (e, { value }) => this.setState({ filter: value })

  onProfileClick = resource => {
    this.setState({ modalProfile: resource });
  }
  closeModal = () => this.setState({ modalProfile: null })

  render() {
    const { profiles } = this.props;
    const { filter, modalProfile } = this.state;
    const filterRE = getRE(filter, 'i');
    const filteredProfiles = profiles.filter(({ name }) => filterRE.test(name));

    return (
      <React.Fragment>
        <SlideModal 
          title={ modalProfile && modalProfile.name }
          isDisplayed={ modalProfile !== null }
          content={ modalProfile && <ProfileInfo profile={ modalProfile } />}
          size="middle"
          onClose={ this.closeModal }
        />
        <BottomBlock>
          <BottomBlock.Header>
            <h4 className="text-lg">Profiler</h4>
            <Input
              className="input-small"
              placeholder="Filter by Name"
              icon="search"
              iconPosition="left"
              name="filter"
              onChange={ this.onFilterChange }
            />
          </BottomBlock.Header>
          <BottomBlock.Content>
            <TimeTable 
              rows={ filteredProfiles }
              onRowClick={ this.onProfileClick }
              hoverable
            >
              {[
                {
                  label: "Name",
                  dataKey: 'name',
                  width: 200,
                  render: renderName,
                }, {
                  label: "Time",
                  key: 'duration',
                  width: 80,
                  render: renderDuration,
                }
              ]}
            </TimeTable>
          </BottomBlock.Content>
        </BottomBlock>
      </React.Fragment>
    );
  }
}

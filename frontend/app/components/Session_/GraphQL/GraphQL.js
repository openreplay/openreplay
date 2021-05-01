//import cn from 'classnames';
import { Icon, NoContent, Input, SlideModal } from 'UI';
import { getRE } from 'App/utils';
import { connectPlayer } from 'Player';
import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock';
import TimeTable from '../TimeTable';
import GQLDetails from './GQLDetails';

function renderDefaultStatus() {
  return "2xx-3xx";
}

@connectPlayer(state => ({
  list: state.graphqlListNow,
}))
export default class GraphQL extends React.PureComponent {
	state = {
		filter: "",
		current: null,
	}
  onFilterChange = (e, { value }) => this.setState({ filter: value })

  setCurrent = (item) => {
    this.setState({ current: item });
  }
  closeModal = () => this.setState({ current: null})

  render() {
    const { list } = this.props;
    const { filter, current } = this.state;
    const filterRE = getRE(filter, 'i');
    const filtered = list
      .filter(({ operationName = "", operationKind = "" }) => filterRE.test(operationName) || filterRE.test(operationKind));

    return (
      <React.Fragment>
        <SlideModal 
          size="middle"
          title={ current &&  <span><i className="color-gray-medium">{current.operationKind}</i> {current.operationName}</span> }
          isDisplayed={ current != null }
          content={ current && 
            <GQLDetails gql={ current }/>
          }
          onClose={ this.closeModal }
        />
        <BottomBlock>
          <BottomBlock.Header>
            <Input
              className="input-small"
              placeholder="Filter by Name or Type"
              icon="search"
              iconPosition="left"
              name="filter"
              onChange={ this.onFilterChange }
            />
          </BottomBlock.Header>
          <BottomBlock.Content>
            <NoContent
              size="small"
              show={ filtered.length === 0}
            >
              <TimeTable
                rows={ filtered }
                onRowClick={ this.setCurrent }
                hoverable
              >
                {[
                  {
                    label: "Status",
                    width: 70,
                    render: renderDefaultStatus,
                  }, {
                    label: "Type",
                    dataKey: "operationKind",
                    width: 60,
                  }, {
                    label: "Name",
                    width: 130,
                    dataKey: "operationName",
                  },
                ]}
              </TimeTable>
            </NoContent>
          </BottomBlock.Content>
        </BottomBlock>
      </React.Fragment>
    );
  }
}


//import cn from 'classnames';
import { getRE } from 'App/utils';
import { Label, NoContent, Input, SlideModal, CloseButton } from 'UI';
import { connectPlayer } from 'Player';
import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock';
import TimeTable from '../TimeTable';
import FetchDetails from './FetchDetails';
import { renderName, renderDuration } from '../Network';

@connectPlayer(state => ({
  list: state.fetchList,
}))
export default class Fetch extends React.PureComponent {
	state = {
		filter: "",
		current: null,
	}
  onFilterChange = (e, { value }) => this.setState({ filter: value })

  setCurrent = (item, index) => {
    this.setState({ current: item, currentIndex: index });
  }

  closeModal = () => this.setState({ current: null})

  nextClickHander = () => {
    const { list } = this.props;
    const { currentIndex } = this.state;
    
    if (currentIndex === list.length  - 1) return;
    const newIndex = currentIndex + 1;
    this.setCurrent(list[newIndex], newIndex);
  }

  prevClickHander = () => {
    const { list } = this.props;
    const { currentIndex } = this.state;

    if (currentIndex === 0) return;
    const newIndex = currentIndex - 1;
    this.setCurrent(list[newIndex], newIndex);
  }

  render() {
    const { list } = this.props;
    const { filter, current, currentIndex } = this.state;
    const filterRE = getRE(filter, 'i');
    const filtered = list
      .filter(({ name }) => filterRE.test(name));      

    return (
      <React.Fragment>
        <SlideModal
          overlay={false}
          right 
          size="middle"
          title={
            <div className="flex justify-between">
              <h1>Fetch Request</h1>
              <div className="flex items-center">
                <div className="flex items-center">
                  <span className="mr-2 color-gray-medium uppercase text-base">Status</span>
                  <Label
                    data-red={current && current.status >= 400}
                    data-green={current && current.status < 400}
                  >
                    <div className="uppercase w-16 justify-center code-font text-lg">{current && current.status}</div>
                  </Label>
                </div>
                <CloseButton onClick={ this.closeModal } size="18" className="ml-2" />
              </div>
            </div>
          }
          isDisplayed={ current != null }
          content={ current && 
            <FetchDetails
              resource={ current }
              nextClick={this.nextClickHander}
              prevClick={this.prevClickHander}
              first={currentIndex === 0}
              last={currentIndex === filtered.length - 1}
            />
          }
          onClose={ this.closeModal }
        />
        <BottomBlock>
          <BottomBlock.Header>
            <h4 className="text-lg">Fetch</h4>
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
            <NoContent
              size="small"
              show={ filtered.length === 0}
            >
              <TimeTable
                rows={ filtered }
                onRowClick={ this.setCurrent }
                hoverable
                // navigation
                activeIndex={currentIndex}
              >
                {[
                  {
                    label: "Status",
                    dataKey: 'status',
                    width: 70,
                  }, {
                    label: "Method",
                    dataKey: "method",
                    width: 60,
                  }, {
                    label: "Name",
                    width: 130,
                    render: renderName,
                  },
                  {
                    label: "Time",
                    width: 80,
                    render: renderDuration,
                  }
                ]}
              </TimeTable>
            </NoContent>
          </BottomBlock.Content>
        </BottomBlock>
      </React.Fragment>
    );
  }
}

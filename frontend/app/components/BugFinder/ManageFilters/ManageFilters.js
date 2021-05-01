import { connect } from 'react-redux';
import { IconButton } from 'UI';
import Funnel from 'Types/funnel';
import {  
  remove as removeFilter,
  setActive as setActiveFilter,
  applyFilter,
  toggleFilterModal
} from 'Duck/filters';
import { 
  fetchList as fetchFilterList,
  save as saveFunnel
} from 'Duck/funnels';
import withToggle from 'Components/hocs/withToggle';
import SaveModal from './SaveModal';

@withToggle('slideModalDisplayed', 'toggleSlideModal')
@connect(
  state =>
    ({
      savedFilters: state.getIn([ 'filters', 'list' ]),
      activeFilter: state.getIn([ 'filters', 'activeFilter' ]),
      fetching: state.getIn([ 'filters', 'fetchListRequest', 'loading' ]),
      loading: state.getIn([ 'filters', 'loading' ]),
      saveModalOpen: state.getIn([ 'filters', 'saveModalOpen' ]),
      appliedFilter: state.getIn([ 'filters', 'appliedFilter' ]),      
      customFilters: state.getIn([ 'filters', 'customFilters']),
    })
  ,
  {
    fetchFilterList,
    saveFunnel,
    removeFilter,
    setActiveFilter,
    applyFilter,
    toggleFilterModal,
  },
)
export default class ManageFilters extends React.PureComponent {
  updateFilter = (name, isPublic = false) => {
    const { appliedFilter } = this.props;    
    const savedFilter = Funnel({name, filter: appliedFilter, isPublic });
    this.props.saveFunnel(savedFilter).then(function() {
      this.props.fetchFilterList();
      this.props.toggleFilterModal(false);
    }.bind(this));
  }

  applyFiltersHandler = (filter) => {
    this.props.applyFilter(filter);
    this.props.toggleSlideModal(false);
  }

  render() {
    const {    
      saveModalOpen,
      appliedFilter,      
    } = this.props;    

    return (
      <div>        
        <IconButton
          primaryText
          className="mr-2"
          label="SAVE FUNNEL"
          onClick={ () => this.props.toggleFilterModal(true) }
        />        
        <SaveModal
          saveModalOpen={ saveModalOpen }
          appliedFilter={ appliedFilter }
          toggleFilterModal={ this.props.toggleFilterModal }
          updateFilter={ this.updateFilter }
        />
      </div>
    );
  }
}

import { connect } from 'react-redux';
import { DNDSource, DNDTarget } from 'Components/hocs/dnd';
import Event, { TYPES } from 'Types/filter/event';
import { operatorOptions } from 'Types/filter';
import { editEvent, removeEvent, clearEvents, applyFilter } from 'Duck/filters';
import { Icon } from 'UI';
import stl from './eventEditor.css';
import { debounce } from 'App/utils';
import AttributeValueField from '../Attributes/AttributeValueField';
import OperatorDropdown from '../Attributes/OperatorDropdown';
import CustomFilters from '../CustomFilters';
import FilterSelectionButton from '../FilterSelectionButton';

const getPlaceholder = ({ type }) => {
  if (type === TYPES.INPUT) return "E.g. First Name";
  if (type === TYPES.LOCATION) return "Specify URL / Path";
  if (type === TYPES.VIEW) return "Specify View Name";
  if (type === TYPES.CONSOLE) return "Specify Error Message";
  if (type === TYPES.CUSTOM) return "Specify Custom Event Name";
  return '';
};

const getLabel = ({ type }) => {
  if (type === TYPES.INPUT) return "Specify Value";
  return getPlaceholder({ type });
};

@DNDTarget('event')
@DNDSource('event')
@connect(state => ({
  isLastEvent: state.getIn([ 'filters', 'appliedFilter', 'events' ]).size === 1,
}), { editEvent, removeEvent, clearEvents, applyFilter })
export default class EventEditor extends React.PureComponent {
  applyFilter = debounce(this.props.applyFilter, 1500)
  
  onChange = (e, { name, value, searchType }) => {
    const { index } = this.props;
    const updFields = { [name]: value };
    if (searchType != null) {
      updFields.searchType = searchType;
    }
    this.props.editEvent(index, updFields);
    this.applyFilter();
  }

  onTargetChange = (e, {target}) => {
    const { index, event } = this.props;
    this.props.editEvent(index, {target});
    this.applyFilter();
  }
  
  onCheckboxChange = ({ target: { name, checked }}) => {
    this.props.editEvent(this.props.index, name, checked);
  }
  
  remove = () => {
    this.props.removeEvent(this.props.index);
    this.applyFilter()
  };

  render() {
    const {
      event,
      index,
      isDragging,
      connectDragSource,
      connectDropTarget,
    } = this.props;
  
    const _operatorOptions = operatorOptions(event);

    const dndBtn = connectDragSource(
      <button className={ stl.button }><Icon name="drag" size="16" /></button>
    );

    return connectDropTarget(
      <div className={ stl.wrapper } style={ isDragging ? { opacity: 0.5 } : null } >
        <div className={ stl.leftSection }>
          <div className={ stl.index }>{ index + 1 }</div>

          <CustomFilters
            index={ index }
            filter={ event }
            buttonComponent={ <FilterSelectionButton label={ (event.source && event.source !== 'js_exception') ? event.source : event.label } />}
            filterType="event"
          />
          
          <OperatorDropdown
            options={ _operatorOptions }
            onChange={ this.onChange }
            value={ event.operator || DEFAULT }
          />
          
          <AttributeValueField
            filter={ event }
            onChange={ this.onChange }
            onTargetChange={ this.onTargetChange }
          />
        </div>
        <div className={ stl.actions }>
          { dndBtn }
          <button className={ stl.button } onClick={ this.remove }>
            <Icon name="close" size="14" />
          </button>
        </div>
      </div>
    );
  }
}

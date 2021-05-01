import { storiesOf } from '@storybook/react';
import { List } from 'immutable';
import Filter from 'Types/filter';
import ActiveFilterDetails from './ManageFilters/ActiveFilterDetails';
import SavedFilterList from './ManageFilters/SavedFilterList';

const savedFilters = List([
  Filter({
    id: 1,
    name: 'First Filter',
    events: [
      {type: 'CLICK', value: 'test'},
      {type: 'CLICK', value: 'test'},
      {type: 'CLICK', value: 'this is some long test to test the text overflow, should show ellipsis'}
    ],
    userCountry: 'IN', userBrowser: 'Chrome', userOs: 'windows'
  }),
  Filter({
    id: 2,
    name: 'Second Filter',
    events: [
      {type: 'CLICK', value: 'test'},
      {type: 'CLICK', value: 'test'},
      {type: 'CLICK', value: 'this is some long test to test the text overflow, should show ellipsis'}
    ],
    userCountry: 'IN', userBrowser: 'Chrome', userOs: 'windows'
  })]
)
storiesOf('ManageFilter', module)
  .add('Filter Details', () => (
    <ActiveFilterDetails activeFilter={ savedFilters.first() } onFilterClick={ null }/>
  ))
  .add('FilterList', () => (
    <SavedFilterList
      savedFilters={ savedFilters }
      activeFilter={ savedFilters.last() }
      onFilterClick={ null }
    />
  ))


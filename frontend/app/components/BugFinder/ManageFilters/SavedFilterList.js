import styles from './savedFilterList.css';

export default ({ savedFilters, activeFilter, onFilterClick }) => (
  <div className={ styles.filtersContainer }>
    { savedFilters && savedFilters.size > 0 &&
      savedFilters.map((filter, index) => filter &&
        <div
          className={ styles.filter }
          data-active={ activeFilter && filter.id === activeFilter.id }
          onClick={ () => onFilterClick(filter) }
          key={ index }
        >
          { filter.name }
        </div>)
    }
  </div>
);

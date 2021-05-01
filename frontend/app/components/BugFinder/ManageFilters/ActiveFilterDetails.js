import { Button } from 'UI';
import styles from './activeFilterDetails.css';
import cn from 'classnames';
import { BrowserIcon, OsIcon } from 'UI';
import TypeBadge from '../EventFilter/TypeBadge';

export default ({
  activeFilter, applyFiltersHandler, removeFilter, loading,
}) => (
  <div className={ styles.filterDetails }>
    <div className={ styles.title }>
      { activeFilter.name }
    </div>
    <div>
      <div className={ styles.userEvents }>
        <div className={ styles.filterLabel }>{ 'User Events' }</div>
        <div className={ styles.list }>
          <div>
            { activeFilter.events.map((item, i) => (
              <div className={ styles.filterType }>
                <div className={ styles.indexCount }>{ i+1 }</div>
                <TypeBadge event={ item } />
                <div className={ styles.value }>{ item.value }</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={ styles.filterType } data-hidden={ !activeFilter.userCountry }>
        <div className={ styles.filterLabel }>{ 'Location:' }</div>
        <div>
          <span className={ styles.badge }>{ activeFilter.userCountry }</span>
        </div>
      </div>

      <div className={ styles.filterType } data-hidden={ !activeFilter.userBrowser }>
        <div className={ styles.filterLabel }>{ 'Browser:' }</div>
        <div className={ cn('flex items-center', styles.badge) }>
          <BrowserIcon browser={ activeFilter.userBrowser || '' } size="16" className="mr-5" />
          <span >{ activeFilter.userBrowser }</span>
        </div>
      </div>

      <div className={ styles.filterType } data-hidden={ !activeFilter.userOs }>
        <div className={ styles.filterLabel }>{ 'OS:' }</div>
        <div className={ cn('flex items-center', styles.badge) }>
          <OsIcon os={ activeFilter.userOs || '' } size="16" className="mr-5" />
          <span >{ activeFilter.userOs }</span>
        </div>
      </div>
    </div>
    <div className={ styles.footer }>
      <Button primary marginRight onClick={ () => applyFiltersHandler(activeFilter) }>{ 'Apply' }</Button>
      <Button
        onClick={ () => removeFilter(activeFilter.id) }
        basic
        loading={ loading }
      >
        { 'Delete' }
      </Button>
    </div>
  </div>
);

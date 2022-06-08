import React from 'react';
import { Icon } from 'UI';
import styles from './countBadge.module.css';
import cn from 'classnames';

const getFixedValue = (val) => {
  let accuracy = 0;
  while (Math.trunc(val * Math.pow(10, accuracy)) === 0) {
    accuracy += 1;
  }
  const parsed = parseFloat(val).toFixed(accuracy).toString();
  return parsed;
};

// eslint-disable-next-line complexity
const CountBadge = ({
  title,
  icon,
  count = '',
  unit = '',
  change,
  oppositeColors = false,
  component,
  className
}) => {
  const viewChange = typeof change === 'number' && change !== 0 ;
  const changeIncrease = change > 0;
  const colorGreen = oppositeColors ? !changeIncrease : changeIncrease;
  return (
    <div className={ cn(className, 'flex items-baseline') }>
      <div className={ cn(styles.countWrapper, 'flex items-baseline') }>
        { icon && <Icon name={ icon } size="18" marginRight="5" className={ styles.icon } /> }
        <span className={ styles.count }> { component || count } </span>
        <span className={ styles.unit }>{ unit }</span>
      </div>
      <div className={ cn(styles.change, 'ml-2') } data-colorgreen={ colorGreen }>
        { viewChange &&
          <div>
            <Icon size="10" name={ changeIncrease ? 'arrow-up' : 'arrow-down' } color={ colorGreen ? 'green' : 'red' } marginRight="5" />
            { `${ getFixedValue(change) }%` }
          </div>
        }
      </div>      
    </div>
  );
}

CountBadge.displayName = 'CountBadge';

export default CountBadge;

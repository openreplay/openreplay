import React from 'react';
import styles from './loadInfo.module.css';
import { numberWithCommas } from 'App/utils'

const LoadInfo = ({ showInfo = false, onClick, event: { fcpTime, visuallyComplete, timeToInteractive }, prorata: { a, b, c } }) => (
  <div>
    <div className={ styles.bar } onClick={ onClick }>
      { typeof fcpTime === 'number' && <div style={ { width: `${ a }%` } } /> }
      { typeof visuallyComplete === 'number' && <div style={ { width: `${ b }%` } } /> } 
      { typeof timeToInteractive === 'number' && <div style={ { width: `${ c }%` } } /> }
    </div>
    <div className={ styles.bottomBlock } data-hidden={ !showInfo }>
      { typeof fcpTime === 'number' && 
        <div className={ styles.wrapper }>
          <div className={ styles.lines } />
          <div className={ styles.label } >{ 'Time to Render' }</div>
          <div className={ styles.value }>{ `${ numberWithCommas(fcpTime || 0) }ms` }</div>
        </div>
      }
      { typeof visuallyComplete === 'number' && 
        <div className={ styles.wrapper }>
          <div className={ styles.lines } />
          <div className={ styles.label } >{ 'Visually Complete' }</div>
          <div className={ styles.value }>{ `${ numberWithCommas(visuallyComplete || 0) }ms` }</div>
        </div>
      }
      { typeof timeToInteractive === 'number' && 
        <div className={ styles.wrapper }>
          <div className={ styles.lines } />
          <div className={ styles.label } >{ 'Time To Interactive' }</div>
          <div className={ styles.value }>{ `${ numberWithCommas(timeToInteractive || 0) }ms` }</div>
        </div>
      }
      {/* <div className={ styles.download }>
        <a>
          <Icon name="download" />
          { '.HAR' }
        </a>
        <div>
          { new Date().toString() }
        </div>
      </div> */}
    </div>
  </div>
);

LoadInfo.displayName = 'LoadInfo';

export default LoadInfo;

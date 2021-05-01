import { Popup } from 'UI';
import { percentOf } from 'App/utils'; 
import styles from './barRow.css'
import tableStyles from './timeTable.css';

const formatTime = time => time < 1000 ? `${ time.toFixed(2) }ms` : `${ time / 1000 }s`;

const BarRow = ({ resource: { time, ttfb = 0, duration, key }, popup=false, timestart = 0, timewidth }) => {  
  const timeOffset = time - timestart;
  ttfb = ttfb || 0;
  const trigger = (
    <div 
      className={ styles.barWrapper }
      style={ { 
        left: `${ percentOf(timeOffset, timewidth) }%`, 
        right: `${ 100 - percentOf(timeOffset + duration, timewidth) }%`,
        minWidth: '5px'
      } } 
    >
      <div
        className={ styles.ttfbBar }
        style={ { 
          width: `${ percentOf(ttfb, duration) }%`,
        } } 
      />
      <div 
        className={ styles.downloadBar } 
        style={ { 
          width: `${ percentOf(duration - ttfb, duration) }%`,
          minWidth: '5px'
        } } 
      />
    </div>
  );
  if (!popup) return <div key={ key } className={ tableStyles.row } > { trigger } </div>;

  return (
    <div key={ key } className={ tableStyles.row } >
      <Popup
        basic
        trigger={ trigger }
        content={ 
          <React.Fragment>
            { ttfb != null &&
              <div className={ styles.popupRow }> 
                <div className={ styles.title }>{ 'Waiting (TTFB)' }</div>
                <div className={ styles.popupBarWrapper} >
                  <div
    								className={ styles.ttfbBar } 
    		            style={{ 
    		              left: 0, 
    		              width: `${ percentOf(ttfb, duration) }%`,
    		            }}
                  />
                </div>
                <div className={ styles.time } >{ formatTime(ttfb) }</div>
              </div>
            }
            <div className={ styles.popupRow }>
              <div className={ styles.title } >{ 'Content Download' }</div>
              <div className= { styles.popupBarWrapper }>
                <div
  								className={ styles.downloadBar } 
  		            style={{ 
  		              left: `${ percentOf(ttfb, duration) }%`, 
  		              width: `${ percentOf(duration - ttfb, duration) }%`,
  		            }}
                />
              </div>
              <div className={ styles.time }>{ formatTime(duration - ttfb) }</div>
            </div>
          </React.Fragment> 
        }
        size="mini"
        position="top center"
      /> 
    </div>
  );  
}

BarRow.displayName = "BarRow";

export default BarRow;
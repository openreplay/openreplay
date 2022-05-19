import styles from './dateOptionLabel.module.css';

export default ({ range }) => (
  <div className={ styles.wrapper }>
    <div>{ range && range.start.format('ll') }</div>
    <div className={ styles.divider }>{ '-' }</div>
    <div>{ range && range.end.format('ll') }</div>
  </div>
);

import styles from './toggler.css';

export default ({
  onChange,
  name,
  className = '',
  checked,
  label = '',
}) => (
  <div className={ className }>
    <label className={styles.label}>
      <div className={ styles.switch }>
        <input
          type={ styles.checkbox }
          onClick={ onChange }
          name={ name }
          checked={ checked }
        />
        <span className={ `${ styles.slider } ${ checked ? styles.checked : '' }` } />
      </div>
      { label && <span>{ label }</span> }
    </label>
  </div>
);

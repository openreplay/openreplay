import styles from './toggler.css';

export default ({
  onChange,
  name,
  className,
  checked,
}) => (
  <div className={ className }>
    <label className={ styles.switch }>
      <input
        type={ styles.checkbox }
        onClick={ onChange }
        name={ name }
        checked={ checked }
      />
      <span className={ `${ styles.slider } ${ checked ? styles.checked : '' }` } />
    </label>
  </div>
);

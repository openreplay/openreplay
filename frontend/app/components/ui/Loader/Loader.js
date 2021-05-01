import cn from 'classnames';
import styles from './loader.css';

const Loader = React.memo(({ className, loading = true, children = null, size, style = { minHeight: '150px' } }) => (!loading ? children :
	<div className={ cn(styles.wrapper, className) } style={style}>
	  <div className={ styles.loader } data-size={ size } />
	</div>
));

Loader.displayName = 'Loader';

export default Loader;

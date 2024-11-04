import React from 'react';
import cn from 'classnames';
import styles from './loader.module.css';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

interface Props {
  className?: string
  loading?: boolean
  children?: React.ReactNode
  size?: number
  style?: Record<string, any>
}

const Loader = React.memo<Props>(
  ({
    className = '',
    loading = true,
    children = null,
    size = 50,
    style = { minHeight: '150px' },
  }) =>
    !loading ? (
      <>
        {children}
      </>
    ) : (
      <div className={cn(styles.wrapper, className)} style={style}>
        {/* <div className={ styles.loader } data-size={ size } /> */}
        <AnimatedSVG name={ICONS.LOADER} size={size} />
      </div>
    )
);

Loader.displayName = 'Loader';

export default Loader;

import React from 'react';
import cn from 'classnames';
import styles from './loader.module.css';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

interface ILoader {
	loading: boolean;
	children?: React.ReactElement;
	className?: string;
    size?: number;
    style?: Record<string, any>
}

const Loader = ({ className = '', loading = true, children, size = 30, style = { minHeight: '150px' } }: ILoader) =>
    !loading ? (
        children
    ) : (
        <div className={cn(styles.wrapper, className)} style={style}>
            <AnimatedSVG name={ICONS.LOADER} size={size} />
        </div>
    )


Loader.displayName = 'Loader';

export default React.memo(Loader);

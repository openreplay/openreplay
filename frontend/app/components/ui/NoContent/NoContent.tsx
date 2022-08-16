import React from 'react';
import { Icon } from 'UI';
import styles from './noContent.module.css';

interface Props {
    title?: any;
    subtext?: any;
    icon?: string;
    iconSize?: number;
    size?: string;
    show?: boolean;
    children?: any;
    image?: any;
    style?: any;
}
export default function NoContent(props: Props) {
    const { title = '', subtext = '', icon, iconSize, size, show, children, image, style } = props;

    return !show ? (
        children
    ) : (
        <div className={`${styles.wrapper} ${size && styles[size]}`} style={style}>
            {icon && <Icon name={icon} size={iconSize} />}
            {title && <div className={styles.title}>{title}</div>}
            {subtext && <div className={styles.subtext}>{subtext}</div>}
            {image && <div className="mt-4 flex justify-center">{image} </div>}
        </div>
    );
}

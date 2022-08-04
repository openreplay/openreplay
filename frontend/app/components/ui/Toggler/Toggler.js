import React from 'react';
import styles from './toggler.module.css';

export default ({ onChange, name, className = '', checked, label = '', plain = false }) => (
    <div className={className}>
        <label className={styles.label}>
            <div className={plain ? styles.switchPlain : styles.switch}>
                <input type={styles.checkbox} onClick={onChange} name={name} checked={checked} />
                <span className={`${plain ? styles.sliderPlain : styles.slider} ${checked ? styles.checked : ''}`} />
            </div>
            {label && <span>{label}</span>}
        </label>
    </div>
);

import styles from './title.module.css';
import React from 'react';

function Title({ title, sub }) {
  return (
    <div className={styles.title}>
      <h4 className="cap-first">{title}</h4>
      <span>{sub}</span>
    </div>
  );
}

Title.displayName = 'Title';

export default Title;

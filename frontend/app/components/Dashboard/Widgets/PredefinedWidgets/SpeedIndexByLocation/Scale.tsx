import React from 'react';
import cn from 'classnames';
import { Styles } from '../../common';
import stl from './scale.module.css';
import { useTranslation } from 'react-i18next';

function Scale({ colors }) {
  const { t } = useTranslation();
  const lastIndex = Styles.compareColors.length - 1;

  return (
    <div className={cn(stl.bars, 'absolute bottom-0 mb-4')}>
      {Styles.compareColors.map((c, i) => (
        <div
          key={i}
          style={{
            backgroundColor: c,
            width: '6px',
            height: '15px',
            marginBottom: '1px',
          }}
          className="flex items-center justify-center"
        >
          {i === 0 && <div className="text-xs pl-12">{t('Slow')}</div>}
          {i === lastIndex && <div className="text-xs pl-12">{t('Fast')}</div>}
        </div>
      ))}
    </div>
  );
}

export default Scale;

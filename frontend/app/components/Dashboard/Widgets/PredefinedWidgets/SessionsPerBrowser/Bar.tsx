import React from 'react';
import { TextEllipsis } from 'UI';
import stl from './Bar.module.css';
import { useTranslation } from 'react-i18next';
// import { Styles } from '../common'

function Bar({
  className = '',
  versions = [],
  width = 0,
  avg,
  domain,
  colors,
}) {
  const { t } = useTranslation();
  return (
    <div className={className}>
      <div className="flex items-center">
        <div
          className={stl.bar}
          style={{ width: `${width < 15 ? 15 : width}%` }}
        >
          {versions.map((v, i) => {
            const w = (v.value * 100) / avg;
            return (
              <div
                key={i}
                className="text-xs"
                style={{ width: `${w}%`, backgroundColor: colors[i] }}
              >
                <TextEllipsis
                  text={v.key}
                  hintText={
                    <div className="text-sm">
                      <div>
                        {t('Version:')}
                        {v.key}
                      </div>
                      <div>
                        {t('Sessions:')}
                        {v.value}
                      </div>
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
        <div className="ml-2">
          <span className="font-medium">{`${avg}`}</span>
        </div>
      </div>
      <div className="text-sm">{domain}</div>
    </div>
  );
}

export default Bar;

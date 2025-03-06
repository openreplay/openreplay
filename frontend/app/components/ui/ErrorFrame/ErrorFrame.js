import React, { useState } from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import stl from './errorFrame.module.css';
import { useTranslation } from 'react-i18next';

function ErrorFrame({ frame = {}, showRaw, isFirst }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(isFirst);
  const hasContext = frame.context && frame.context.length > 0;
  return (
    <div>
      {showRaw ? (
        <div className={stl.rawLine}>
          {t('at')}
          {frame.function ? frame.function : '?'}{' '}
          <span className="color-gray-medium">
            ({`${frame.filename}:${frame.lineNo}:${frame.colNo}`})
          </span>
        </div>
      ) : (
        <div className={stl.formatted}>
          <div
            className={cn(stl.header, 'flex items-center cursor-pointer')}
            onClick={() => setOpen(!open)}
          >
            <div className="truncate">
              <span className="font-medium">{frame.absPath}</span>
              {frame.function && (
                <>
                  <span>&nbsp;{t('in')}&nbsp;</span>
                  <span className="font-medium"> {frame.function} </span>
                </>
              )}
              <span>&nbsp;{t('at line')}&nbsp;</span>
              <span className="font-medium">
                {frame.lineNo}:{frame.colNo}
              </span>
            </div>
            {hasContext && (
              <div className="ml-auto mr-3">
                <Icon
                  name={open ? 'minus' : 'plus'}
                  size="14"
                  color="gray-medium"
                />
              </div>
            )}
          </div>
          {open && hasContext && (
            <ol start={frame.context[0][0]} className={stl.content}>
              {frame.context.map((i) => (
                <li
                  key={i[0]}
                  className={cn('leading-7  text-sm break-all h-auto pl-2', {
                    [stl.errorLine]: i[0] == frame.lineNo,
                  })}
                >
                  <span>{i[1].replace(/ /g, '\u00a0')}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

export default ErrorFrame;

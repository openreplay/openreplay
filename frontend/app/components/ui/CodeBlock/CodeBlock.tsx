import React, { useEffect } from 'react';
import copyFn from 'copy-to-clipboard';
import { Files } from 'lucide-react';
import { Tooltip } from 'antd';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

interface Props {
  code?: string;
  extra?: string;
  language?: string;
  copy?: boolean;
  width?: string;
  height?: string;
}

export default function CodeBlock({
  code = '',
  extra = '',
  language = 'javascript',
  copy = false,
  width = undefined,
  height = undefined,
}: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    setTimeout(() => {
      if (window.Prism) {
        Prism.highlightAll();
      }
    }, 0);
  }, [code, language]);

  return (
    <div className={'relative'}>
      {extra || copy ? (
        <div className={'w-full flex items-center justify-between mb-2'}>
          {extra && <div className="text-sm text-disabled-text">{extra}</div>}
          {copy && (
            <div className="cursor-pointer" onClick={() => copyFn(code)}>
              <Tooltip title={t('Copy code')} placement={'bottomLeft'}>
                <Files size={14} />
              </Tooltip>
            </div>
          )}
        </div>
      ) : null}
      <pre
        className={cn(
          'rounded-lg relative',
          width ? 'overflow-x-auto' : '',
          height ? 'overflow-y-auto' : '',
        )}
        style={{ maxWidth: width, maxHeight: height }}
      >
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}

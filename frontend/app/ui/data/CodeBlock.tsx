import { CopyButton } from '@/ui/actions/CopyButton';
import { IconButton } from '@/ui/actions/IconButton';
import { Eye, EyeOff } from 'lucide-react';
import { Fragment, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import './code-block.css';
import { tokenize } from './code-tokens';

export interface CodeBlockProps {
  code: string;

  language?: string;

  caption?: ReactNode;

  highlight?: string;

  onCopied?: () => void;

  inline?: boolean;
  copyLabel?: string;

  plain?: boolean;

  secret?: boolean;

  secretLabel?: string;
}

export function CodeBlock({
  code,
  language,
  caption,
  highlight,
  onCopied,
  inline,
  copyLabel: copyLabelProp,
  plain,
  secret,
  secretLabel = 'value',
}: CodeBlockProps) {
  const { t } = useTranslation();
  const copyLabel = copyLabelProp ?? t('Copy');
  const [shown, setShown] = useState(!secret);

  const masked = !!secret && !shown;
  const body = masked
    ? '•'.repeat(Math.min(code.length, 36))
    : plain
      ? code
      : tokenize(code).map((tok, i) => (
          <span
            key={i}
            className={
              tok.type === 'plain'
                ? undefined
                : `m-code__t m-code__t-${tok.type}`
            }
          >
            {highlight && tok.text.includes(highlight)
              ? markUp(tok.text, highlight)
              : tok.text}
          </span>
        ));
  const reveal = secret ? (
    <IconButton
      icon={shown ? <EyeOff size={14} /> : <Eye size={14} />}
      label={
        shown
          ? t('Hide {{label}}', { label: secretLabel })
          : t('Show {{label}}', { label: secretLabel })
      }
      variant="ghost"
      size="xs"
      onClick={() => setShown((v) => !v)}
    />
  ) : null;

  // one row for every copy: a field's height, the small ghost copy centred
  const button = (
    <CopyButton
      text={code}
      label={copyLabel}
      onCopied={onCopied}
      variant="ghost"
      size="xs"
    />
  );
  const oneLine = !code.includes('\n');
  if (inline) {
    return (
      <div
        className={`m-code m-code--inline${oneLine ? ' m-code--value' : ''}`}
      >
        <pre className="m-code__pre" tabIndex={0}>
          <code
            className={
              masked
                ? 'm-code__value is-masked'
                : plain
                  ? 'm-code__value'
                  : undefined
            }
          >
            {body}
          </code>
        </pre>
        {reveal}
        {button}
      </div>
    );
  }
  return (
    <figure className="m-code">
      <figcaption className="m-code__head">
        <span className="m-code__caption">
          {caption}
          {caption && language ? (
            <span className="m-code__sep" aria-hidden="true">
              ·
            </span>
          ) : null}
          {language && <span className="m-code__lang">{language}</span>}
        </span>
        <span className="inline-flex items-center">
          {reveal}
          {button}
        </span>
      </figcaption>
      <pre className="m-code__pre" tabIndex={0}>
        <code className={masked ? 'is-masked' : undefined}>{body}</code>
      </pre>
    </figure>
  );
}

function markUp(code: string, needle: string): ReactNode {
  if (!needle) return code;
  const parts = code.split(needle);
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && <mark className="m-code__mark">{needle}</mark>}
    </Fragment>
  ));
}

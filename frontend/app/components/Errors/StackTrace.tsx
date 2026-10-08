import { CodeBlock } from '@/ui/data/CodeBlock';
import { Notice } from '@/ui/feedback/Notice';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { Segmented } from '@/ui/inputs/toggle-group';
import { Section } from '@/ui/overlays/EntityDrawer';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import './error-drawer.css';

const DOCS = 'https://docs.openreplay.com/deployment/upload-sourcemaps';

export interface Frame {
  key?: string;
  absPath?: string;
  filename?: string;
  function?: string;
  lineNo?: number;
  colNo?: number;
  context?: [number, string][];
}

interface Props {
  name: string;
  message: string;
  frames: Frame[];
  loading: boolean;
  sourcemapUploaded: boolean;
}

/** Resolved frames with their source around the line, or the raw stack to copy. */
function StackTrace({
  name,
  message,
  frames,
  loading,
  sourcemapUploaded,
}: Props) {
  const { t } = useTranslation();
  const [raw, setRaw] = React.useState(false);

  const rawText = [
    `${name}: ${message}`,
    ...frames.map(
      (f) =>
        `    at ${f.function || '?'} (${f.filename}:${f.lineNo}:${f.colNo})`,
    ),
  ].join('\n');

  return (
    <Section
      title={t('Stack trace')}
      action={
        frames.length > 0 && (
          <Segmented
            ariaLabel={t('Stack trace view')}
            value={raw ? 'raw' : 'full'}
            onChange={(v) => setRaw(v === 'raw')}
            options={[
              { value: 'full', label: t('Source') },
              { value: 'raw', label: t('Raw') },
            ]}
          />
        )
      }
    >
      {!sourcemapUploaded && !loading && (
        <Notice className="m-errd__notice">
          {t('Upload source maps to see the original code in this trace.')}{' '}
          <a href={DOCS} target="_blank" rel="noreferrer">
            {t('Learn more')}
          </a>
        </Notice>
      )}
      {loading ? (
        <SkeletonRows rows={4} />
      ) : frames.length === 0 ? (
        <p className="m-errd__none">{t('No stack trace for this error.')}</p>
      ) : raw ? (
        <CodeBlock plain code={rawText} copyLabel={t('Copy stack')} />
      ) : (
        <div className="m-errd__frames">
          {frames.map((f, i) => (
            <StackFrame key={f.key ?? i} frame={f} open={i === 0} />
          ))}
        </div>
      )}
    </Section>
  );
}

export function StackFrame({ frame, open }: { frame: Frame; open: boolean }) {
  const { t } = useTranslation();
  const context = frame.context ?? [];
  const head = (
    <>
      {context.length > 0 && (
        <ChevronRight size={13} className="m-errd__chev" aria-hidden="true" />
      )}
      <span className="m-errd__path m-truncate">
        {frame.absPath || frame.filename}
      </span>
      {frame.function && (
        <span className="m-errd__fn m-truncate">
          {t('in')} <b>{frame.function}</b>
        </span>
      )}
      <span className="m-errd__pos">
        {frame.lineNo}:{frame.colNo}
      </span>
    </>
  );

  if (!context.length) {
    return (
      <div className="m-errd__frame">
        <div className="m-errd__frame-head">{head}</div>
      </div>
    );
  }
  return (
    <details className="m-errd__frame" open={open}>
      <summary className="m-errd__frame-head">{head}</summary>
      <ol className="m-errd__ctx m-mono" start={context[0][0]}>
        {context.map(([line, text]) => (
          <li
            key={line}
            className={line === frame.lineNo ? 'is-hit' : undefined}
          >
            {text}
          </li>
        ))}
      </ol>
    </details>
  );
}

export default StackTrace;

import { CopyButton } from '@/ui/actions/CopyButton';
import { Highlight, holds } from '@/ui/data/Highlight';
import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import './code-block.css';
import './json-tree.css';

export interface JsonTreeProps {
  value: unknown;
  /** levels open on arrival; deeper objects and arrays mount folded */
  openDepth?: number;
  /** each line gets the kit copy on hover: a leaf copies its value, an object
   *  itself as JSON, the first line the whole thing */
  copyable?: boolean;
  /** keeps only what holds it, opened, with the match marked */
  query?: string;
  className?: string;
}

/** A payload read as JSON, in the code block's palette; objects fold. */
export function JsonTree({
  value,
  openDepth = 2,
  copyable = false,
  query = '',
  className,
}: JsonTreeProps) {
  const { t } = useTranslation();
  const q = query.trim();
  const shown = q ? prune(value, q) : value;
  return (
    <div
      className={`m-json m-mono${className ? ` ${className}` : ''}`}
      role="tree"
    >
      {shown === undefined ? (
        <p className="m-json__none">{t('Nothing matches “{{q}}”', { q })}</p>
      ) : (
        <JsonNode
          value={shown}
          depth={0}
          last
          openDepth={openDepth}
          copyable={copyable}
          query={q}
        />
      )}
    </div>
  );
}

/** The part of a value that holds the query; undefined when none does. */
function prune(v: unknown, q: string): unknown {
  if (v != null && typeof v === 'object') {
    const arr = Array.isArray(v);
    const entries: [string, unknown][] = arr
      ? (v as unknown[]).map((x, i) => [String(i), x])
      : Object.entries(v as Record<string, unknown>);
    const kept = entries.flatMap(([k, x]): [string, unknown][] => {
      if (!arr && holds(k, q)) return [[k, x]];
      const p = prune(x, q);
      return p === undefined ? [] : [[k, p]];
    });
    if (!kept.length) return undefined;
    return arr ? kept.map(([, x]) => x) : Object.fromEntries(kept);
  }
  return holds(String(v), q) ? v : undefined;
}

const asText = (v: unknown) =>
  typeof v === 'string' ? v : (JSON.stringify(v, null, 2) ?? String(v));

function Copy({
  value,
  name,
  root,
}: {
  value: unknown;
  name?: string;
  root: boolean;
}) {
  const { t } = useTranslation();
  const label = root
    ? t('Copy all of it')
    : name != null
      ? t('Copy {{name}}', { name })
      : t('Copy this value');
  return (
    <span className="m-json__copy">
      <CopyButton
        variant="ghost"
        size="xs"
        text={asText(value)}
        label={label}
      />
    </span>
  );
}

function JsonNode({
  name,
  value,
  depth,
  last,
  openDepth,
  copyable,
  query,
}: {
  name?: string;
  value: unknown;
  depth: number;
  last: boolean;
  openDepth: number;
  copyable: boolean;
  query: string;
}) {
  const { t } = useTranslation();
  const [folded, setOpen] = useState(depth < openDepth);
  const open = query ? true : folded;
  const comma = last ? '' : ',';
  const key =
    name != null ? (
      <>
        <span className="m-json__key">
          <Highlight text={name} query={query} />
        </span>
        <span className="m-code__t-punct">: </span>
      </>
    ) : null;
  const copy = copyable ? (
    <Copy value={value} name={name} root={depth === 0} />
  ) : null;

  if (value != null && typeof value === 'object') {
    const isArr = Array.isArray(value);
    const entries = isArr
      ? (value as unknown[]).map((v, i) => [String(i), v] as const)
      : Object.entries(value as Record<string, unknown>);
    const [o, c] = isArr ? ['[', ']'] : ['{', '}'];
    return (
      <div className="m-json__node" role="treeitem" aria-expanded={open}>
        <Line copy={copy}>
          <button
            type="button"
            className="m-json__fold"
            onClick={() => setOpen(!open)}
            disabled={!!query}
            aria-label={open ? t('Collapse') : t('Expand')}
          >
            {key}
            <span className="m-code__t-punct">{o}</span>
            {!open && <span className="m-json__ellip">{entries.length}</span>}
            {!open && (
              <span className="m-code__t-punct">
                {c}
                {comma}
              </span>
            )}
            <span className="m-json__caret" aria-hidden="true">
              {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </span>
          </button>
        </Line>
        {open && (
          <div className="m-json__children" role="group">
            {entries.map(([k, v], i) => (
              <JsonNode
                key={k}
                name={isArr ? undefined : k}
                value={v}
                depth={depth + 1}
                last={i === entries.length - 1}
                openDepth={openDepth}
                copyable={copyable}
                query={query}
              />
            ))}
            <div>
              <span className="m-code__t-punct">
                {c}
                {comma}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  let tok: ReactNode;
  const text = <Highlight text={String(value)} query={query} />;
  if (typeof value === 'string')
    tok = <span className="m-code__t-string">"{text}"</span>;
  else if (typeof value === 'number')
    tok = <span className="m-code__t-number">{text}</span>;
  else tok = <span className="m-code__t-keyword">{text}</span>;
  return (
    <div className="m-json__leaf" role="treeitem">
      <Line copy={copy}>
        <span className="m-json__text">
          {key}
          {tok}
          <span className="m-code__t-punct">{comma}</span>
        </span>
      </Line>
    </div>
  );
}

function Line({ copy, children }: { copy: ReactNode; children: ReactNode }) {
  if (!copy) return <>{children}</>;
  return (
    <div className="m-json__line">
      {children}
      {copy}
    </div>
  );
}

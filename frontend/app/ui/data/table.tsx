import { cn } from '@/lib/utils';
import { Checkbox } from '@/ui/inputs/checkbox';
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { SortIcon, type SortOrder } from './sort-icon';

export interface Column<T> {
  title?: ReactNode;
  key: string;

  width?: number | string;
  align?: 'left' | 'right' | 'center';
  render: (row: T, index: number) => ReactNode;

  spanning?: (row: T) => boolean;

  sortable?: boolean;

  className?: string;
}

export interface TableSort {
  key: string;
  desc: boolean;
}

export interface TableSelection<T> {
  selected: readonly string[];
  onChange: (keys: string[]) => void;

  selectable?: (row: T) => boolean;

  label?: (row: T) => string;
}

export interface DataTableProps<T> {
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T, e: MouseEvent<HTMLTableRowElement>) => void;
  rowClassName?: (row: T) => string | undefined;

  rowStyle?: (row: T) => CSSProperties | undefined;

  stickyHeader?: boolean;

  isSpanningRow?: (row: T) => boolean;

  sort?: TableSort | null;

  onSort?: (key: string | null, desc: boolean) => void;
  /** Turns headers into drag handles; drops `from` onto `to`'s slot. */
  onColumnMove?: (from: string, to: string) => void;
  selection?: TableSelection<T>;
  className?: string;
  ariaLabel?: string;
}

const CONTROL =
  'button, a, input, textarea, [role="checkbox"], [role="menu"], [role="menuitem"], [data-slot="select-trigger"]';

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowClassName,
  rowStyle,
  stickyHeader,
  isSpanningRow,
  sort,
  onSort,
  onColumnMove,
  selection,
  className,
  ariaLabel,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const endDrag = () => {
    setDragKey(null);
    setOverKey(null);
  };
  const stickyTh = stickyHeader ? 'sticky z-[2] bg-surface-default' : undefined;
  const stickyStyle = stickyHeader
    ? { top: 'var(--m-panel-head-h, 0px)' }
    : undefined;
  const alignOf = (a?: Column<T>['align']) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  const cycle = (key: string) => {
    if (!onSort) return;
    if (sort?.key !== key) onSort(key, false);
    else if (!sort.desc) onSort(key, true);
    else onSort(null, false);
  };
  const orderOf = (key: string): SortOrder =>
    sort?.key === key ? (sort.desc ? 'descend' : 'ascend') : null;

  const selectedSet = useMemo(
    () => new Set(selection?.selected ?? []),
    [selection?.selected],
  );
  // keyed with each row's own index, exactly as the rows below are
  const selectableKeys = selection
    ? rows.flatMap((r, i) =>
        (selection.selectable?.(r) ?? true) ? [rowKey(r, i)] : [],
      )
    : [];
  const allOn =
    selection != null &&
    selectableKeys.length > 0 &&
    selectableKeys.every((k) => selectedSet.has(k));
  const someOn =
    selection != null &&
    !allOn &&
    selectableKeys.some((k) => selectedSet.has(k));
  const span = columns.length + (selection ? 1 : 0);

  const body = (
    <TableBodyRows
      columns={columns}
      rows={rows}
      rowKey={rowKey}
      onRowClick={onRowClick}
      rowClassName={rowClassName}
      rowStyle={rowStyle}
      isSpanningRow={isSpanningRow}
      selection={selection}
      selectedSet={selectedSet}
      span={span}
    />
  );

  return (
    <table
      data-slot="table"
      className={cn('w-full table-fixed border-collapse', className)}
      aria-label={ariaLabel}
    >
      <colgroup>
        {selection && <col style={{ width: 40 }} />}
        {columns.map((c) => (
          <col
            key={c.key}
            style={
              c.width
                ? {
                    width:
                      typeof c.width === 'number' ? `${c.width}px` : c.width,
                  }
                : undefined
            }
          />
        ))}
      </colgroup>

      <thead>
        <tr>
          {selection && (
            <th
              scope="col"
              className={cn(
                'h-[1.875rem] border-b border-border-subtle pl-7 pr-2 text-left',
                stickyTh,
              )}
              style={stickyStyle}
            >
              <Checkbox
                aria-label={
                  allOn
                    ? t('Deselect every row on this page')
                    : t('Select every row on this page')
                }
                checked={allOn ? true : someOn ? 'indeterminate' : false}
                onCheckedChange={(v) =>
                  selection.onChange(
                    v === true
                      ? [...new Set([...selection.selected, ...selectableKeys])]
                      : selection.selected.filter(
                          (k) => !selectableKeys.includes(k),
                        ),
                  )
                }
              />
            </th>
          )}
          {columns.map((c) => {
            const order = c.sortable ? orderOf(c.key) : null;
            return (
              <th
                key={c.key}
                scope="col"
                aria-sort={
                  c.sortable
                    ? order === 'ascend'
                      ? 'ascending'
                      : order === 'descend'
                        ? 'descending'
                        : 'none'
                    : undefined
                }
                className={cn(
                  'h-[1.875rem] border-b border-border-subtle px-4 first:pl-7 last:pr-7',
                  'text-xs font-normal text-content-muted',
                  alignOf(c.align),
                  stickyTh,
                  onColumnMove && 'cursor-grab',
                  dragKey === c.key && 'opacity-50',
                  overKey === c.key &&
                    'shadow-[inset_2px_0_0_var(--m-border-accent)]',
                  c.className,
                )}
                style={stickyStyle}
                draggable={onColumnMove ? true : undefined}
                onDragStart={
                  onColumnMove
                    ? (e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        setDragKey(c.key);
                      }
                    : undefined
                }
                onDragOver={
                  onColumnMove
                    ? (e) => {
                        if (!dragKey || dragKey === c.key) return;
                        e.preventDefault();
                        setOverKey(c.key);
                      }
                    : undefined
                }
                onDragLeave={
                  onColumnMove
                    ? () => setOverKey((k) => (k === c.key ? null : k))
                    : undefined
                }
                onDrop={
                  onColumnMove
                    ? (e) => {
                        e.preventDefault();
                        if (dragKey && dragKey !== c.key)
                          onColumnMove(dragKey, c.key);
                        endDrag();
                      }
                    : undefined
                }
                onDragEnd={onColumnMove ? endDrag : undefined}
              >
                {c.sortable ? (
                  <button
                    type="button"
                    onClick={() => cycle(c.key)}
                    className={cn(
                      'group/th m-hover -mx-1 inline-flex h-full max-w-full items-center gap-2 rounded-chip px-1',
                      'select-none whitespace-nowrap hover:text-content-secondary',
                      c.align === 'right' && 'flex-row-reverse',
                      order && 'text-content-primary',
                    )}
                  >
                    <span className="truncate">{c.title}</span>
                    <SortIcon sortOrder={order} />
                  </button>
                ) : (
                  c.title
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      {body}
    </table>
  );
}

function TableBodyRows<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowClassName,
  rowStyle,
  isSpanningRow,
  selection,
  selectedSet,
  span,
}: Pick<
  DataTableProps<T>,
  | 'columns'
  | 'rows'
  | 'rowKey'
  | 'onRowClick'
  | 'rowClassName'
  | 'rowStyle'
  | 'isSpanningRow'
  | 'selection'
> & { selectedSet: Set<string>; span: number }) {
  const { t } = useTranslation();
  const alignOf = (a?: Column<T>['align']) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';
  const onRow = (row: T) => (e: MouseEvent<HTMLTableRowElement>) => {
    if ((e.target as HTMLElement).closest(CONTROL)) return;
    onRowClick?.(row, e);
  };
  // a clickable row is reachable and openable from the keyboard
  const onRowKey = (row: T) => (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key !== 'Enter') return;
    onRowClick?.(row, e as unknown as MouseEvent<HTMLTableRowElement>);
  };
  return (
    <tbody>
      {rows.map((row, i) => {
        const spans = isSpanningRow?.(row) ?? false;
        const key = rowKey(row, i);
        const canSelect =
          selection != null && !spans && (selection.selectable?.(row) ?? true);
        return (
          <tr
            key={key}
            data-slot={spans ? 'group-row' : 'row'}
            style={rowStyle?.(row)}
            onClick={spans ? undefined : onRow(row)}
            tabIndex={!spans && onRowClick ? 0 : undefined}
            onKeyDown={!spans && onRowClick ? onRowKey(row) : undefined}
            className={cn(
              'border-b border-border-subtle',

              'm-hover',
              spans
                ? 'bg-surface-sunken'
                : onRowClick && 'cursor-pointer hover:bg-surface-hover',
              rowClassName?.(row),
            )}
          >
            {spans ? (
              <td colSpan={span} className="px-7 py-2">
                {columns.find((c) => c.spanning?.(row))?.render(row, i)}
              </td>
            ) : (
              <>
                {selection && (
                  <td className="h-[calc(var(--m-row-height)+1px)] py-3 pl-7 pr-2 align-middle">
                    {canSelect && (
                      <Checkbox
                        aria-label={selection.label?.(row) ?? t('Select row')}
                        checked={selectedSet.has(key)}
                        onCheckedChange={(v) =>
                          selection.onChange(
                            v === true
                              ? [...selection.selected, key]
                              : selection.selected.filter((k) => k !== key),
                          )
                        }
                      />
                    )}
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'h-[calc(var(--m-row-height)+1px)] px-4 py-3 first:pl-7 last:pr-7 align-middle text-sm',
                      alignOf(c.align),
                      c.className,
                    )}
                  >
                    {c.render(row, i)}
                  </td>
                ))}
              </>
            )}
          </tr>
        );
      })}
    </tbody>
  );
}

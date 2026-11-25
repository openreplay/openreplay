import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import '@/ui/filters/display-menu.css';
import { Segmented } from '@/ui/inputs/toggle-group';
import { RenameDialog } from '@/ui/overlays/RenameDialog';
import { PopoverPanel } from '@/ui/overlays/popover';
import { toast } from '@/ui/overlays/toast';
import { Download, LoaderCircle } from 'lucide-react';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { OtelLog } from 'App/services/OtelLogsService';
import { CSV_BOM, saveBlob } from 'App/utils/download';

import {
  EXPORT_LIMIT,
  type ExportFormat,
  SearchChangedError,
  compactCount,
  exportFileName,
  exportLines,
} from './logs-logic';

export interface ExportControlProps {
  /** lines matching, the export takes the newest EXPORT_LIMIT */
  total: number;
  /** lines loaded so far */
  loaded: number;
  /** loads what the export needs and hands it over */
  collect: (signal: AbortSignal) => Promise<readonly OtelLog[]>;
  from: number;
  to: number;
  columns: readonly string[];
  ruleCount: number;
}

export function ExportControl({
  total,
  loaded,
  collect,
  from,
  to,
  columns,
  ruleCount,
}: ExportControlProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [job, setJob] = useState<AbortController | null>(null);
  const busy = job != null;
  useEffect(() => () => job?.abort(), [job]);
  const n = Math.min(total, EXPORT_LIMIT);
  const capped = total > EXPORT_LIMIT;
  const sameDay = DateTime.fromMillis(from).hasSame(
    DateTime.fromMillis(to),
    'day',
  );
  const span = t('{{from}} to {{to}}', {
    from: DateTime.fromMillis(from).toFormat('LLL d, HH:mm'),
    to: DateTime.fromMillis(to).toFormat(sameDay ? 'HH:mm' : 'LLL d, HH:mm'),
  });
  const cancel = () => {
    job?.abort();
    setJob(null);
  };
  const download = async () => {
    const ctl = new AbortController();
    setJob(ctl);
    try {
      const lines = await collect(ctl.signal);
      if (ctl.signal.aborted) return;
      const body = exportLines(t, lines, format, columns);
      const blob = new Blob(format === 'csv' ? [CSV_BOM, body] : [body], {
        type: format === 'csv' ? 'text/csv' : 'application/x-ndjson',
      });
      saveBlob(blob, exportFileName(from, to, format));
      setOpen(false);
    } catch (e) {
      if (ctl.signal.aborted) return;
      // the popover stays open to try again
      toast.error(
        e instanceof SearchChangedError
          ? t('The search changed, export again.')
          : t('Some lines could not load, so nothing was exported'),
      );
    } finally {
      setJob((j) => (j === ctl ? null : j));
    }
  };
  const content = (
    <div className="m-dm m-logs__export">
      <div className="m-dm__section">
        <p className="m-dm__heading">{t('Export lines')}</p>
        <p className="m-logs__export-what">
          {ruleCount > 0
            ? t('{{n}} lines, {{span}}, with {{f}} filters.', {
                n: compactCount(n),
                count: n,
                span,
                f: ruleCount,
              })
            : t('{{n}} lines, {{span}}.', {
                n: compactCount(n),
                count: n,
                span,
              })}
        </p>
        {/* not a label: a click on it would press the first segment */}
        <div className="m-dm__row">
          <span className="m-dm__label">{t('Format')}</span>
          <Segmented<ExportFormat>
            ariaLabel={t('Format')}
            value={format}
            onChange={setFormat}
            options={[
              {
                value: 'csv',
                label: 'CSV',
                title: t(
                  'The table as shown: time, the columns on, the message',
                ),
              },
              {
                value: 'json',
                label: 'JSON',
                title: t('Every field of every line, one per row'),
              },
            ]}
          />
        </div>
        <p className="m-logs__export-note">
          {format === 'csv'
            ? t('Time, the columns on screen, and the message.')
            : t('Every field of each line, one line per row.')}
          {capped
            ? ` ${t('The newest {{n}} of {{total}}; narrow the window for the rest.', { n: compactCount(EXPORT_LIMIT), total: compactCount(total) })}`
            : ''}
        </p>
      </div>
      <div className="m-dm__foot m-logs__export-foot">
        {busy ? (
          <>
            <span className="m-logs__export-progress">
              <LoaderCircle size={13} className="m-spin" aria-hidden="true" />
              {t('{{shown}} of {{total}}', {
                shown: Math.min(loaded, n).toLocaleString(),
                total: n.toLocaleString(),
              })}
            </span>
            <Button onClick={cancel}>{t('Cancel')}</Button>
          </>
        ) : (
          <Button
            variant="primary"
            disabled={n === 0}
            onClick={() => void download()}
          >
            <Download size={13} />
            {t('Download')}
          </Button>
        )}
      </div>
    </div>
  );
  return (
    <PopoverPanel
      open={open}
      onOpenChange={(o) => {
        if (!o) cancel();
        setOpen(o);
      }}
      placement="bottomRight"
      content={content}
    >
      <IconButton
        icon={<Download size={15} />}
        label={t('Export')}
        open={open}
      />
    </PopoverPanel>
  );
}

export function SaveViewDialog({
  open,
  onSave,
  onCancel,
}: {
  open: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <RenameDialog
      open={open}
      title={t('Save as view')}
      value=""
      okText={t('Save view')}
      placeholder={t('e.g. Checkout errors')}
      onOk={onSave}
      onCancel={onCancel}
    />
  );
}

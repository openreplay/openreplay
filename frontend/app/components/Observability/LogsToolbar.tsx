import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import '@/ui/filters/display-menu.css';
import { Segmented } from '@/ui/inputs/toggle-group';
import { RenameDialog } from '@/ui/overlays/RenameDialog';
import { PopoverPanel } from '@/ui/overlays/popover';
import { Download } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { OtelLog } from 'App/services/OtelLogsService';

import {
  EXPORT_LIMIT,
  type ExportFormat,
  exportFileName,
  exportLines,
} from './logs-logic';

export interface ExportControlProps {
  /** lines matching, the export takes the newest EXPORT_LIMIT */
  total: number;
  /** loads what the export needs and hands it over */
  collect: () => Promise<readonly OtelLog[]>;
  from: number;
  to: number;
  columns: readonly string[];
  ruleCount: number;
}

export function ExportControl({
  total,
  collect,
  from,
  to,
  columns,
  ruleCount,
}: ExportControlProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
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
  const download = async () => {
    setBusy(true);
    try {
      const lines = await collect();
      const body = exportLines(lines, format, columns);
      const blob = new Blob([body], {
        type: format === 'csv' ? 'text/csv' : 'application/x-ndjson',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName(from, to, format);
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };
  const content = (
    <div className="m-dm m-logs__export">
      <div className="m-dm__section">
        <p className="m-dm__heading">{t('Export lines')}</p>
        <p className="m-logs__export-what">
          {ruleCount > 0
            ? t('{{n}} lines, {{span}}, with {{f}} filters.', {
                n: n.toLocaleString(),
                count: n,
                span,
                f: ruleCount,
              })
            : t('{{n}} lines, {{span}}.', {
                n: n.toLocaleString(),
                count: n,
                span,
              })}
        </p>
        <label className="m-dm__row">
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
        </label>
        <p className="m-logs__export-note">
          {format === 'csv'
            ? t('Time, the columns on screen, and the message.')
            : t('Every field of each line, one line per row.')}
          {capped
            ? ` ${t('The newest {{n}} of {{total}}; narrow the window for the rest.', { n: EXPORT_LIMIT.toLocaleString(), total: total.toLocaleString() })}`
            : ''}
        </p>
      </div>
      <div className="m-dm__foot">
        <Button
          variant="primary"
          disabled={n === 0}
          loading={busy}
          onClick={() => void download()}
        >
          <Download size={13} />
          {t('Download')}
        </Button>
      </div>
    </div>
  );
  return (
    <PopoverPanel
      open={open}
      onOpenChange={setOpen}
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

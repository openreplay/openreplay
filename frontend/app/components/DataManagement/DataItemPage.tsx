import { EditableRow } from '@/ui/inputs/EditableRow';
import { Switch } from '@/ui/inputs/switch';
import { PageCard, PagePanel } from '@/ui/layout/PageCard';
import { Tooltip } from '@/ui/overlays/tooltip';
import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import './data-management.css';

export interface DataItemRow {
  label: string;
  value: string;
  onSave?: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  display?: ReactNode;
  hint?: ReactNode;
}

interface Props {
  back: { label: string; onClick: () => void };
  /** The human name, as the page title. */
  title: string;
  /** The raw name, in a mono pill beside the title. */
  name: string;
  actions?: ReactNode;
  rows: DataItemRow[];
  status?: { hidden: boolean; onChange: (hidden: boolean) => void };
  /** The related list under the rows, in its own `PagePanel`. */
  footer?: ReactNode;
}

/** One event or property: editable rows, a visibility switch, a related list. */
function DataItemPage({
  back,
  title,
  name,
  actions,
  rows,
  status,
  footer,
}: Props) {
  const { t } = useTranslation();
  return (
    <PageCard
      back={back}
      title={title}
      meta={<span className="m-ditem__pill m-dmg__mono">{name}</span>}
      actions={actions}
      split
    >
      <PagePanel>
        <div className="m-ditem__rows">
          {rows.map((r) => (
            <EditableRow key={r.label} {...r} />
          ))}
          {status && (
            <div className="m-erow">
              <div className="m-erow__label">
                <Tooltip
                  title={
                    status.hidden
                      ? t('Hidden from search and analytics.')
                      : t('Visible in search and analytics.')
                  }
                >
                  <span className="m-ditem__dotted">{t('Status')}</span>
                </Tooltip>
              </div>
              <div className="m-erow__value">
                <label className="inline-flex items-center gap-3 text-sm">
                  <Switch
                    checked={!status.hidden}
                    onCheckedChange={(on) => status.onChange(!on)}
                    aria-label={t('Visible in search and analytics')}
                  />
                  <span className="text-content-secondary">
                    {status.hidden ? t('Hidden') : t('Visible')}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </PagePanel>
      {footer}
    </PageCard>
  );
}

export default DataItemPage;

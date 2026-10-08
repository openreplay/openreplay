import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { CountSuffix } from '@/ui/data/CountSuffix';
import { Tabs, TabsList, TabsTrigger } from '@/ui/layout/tabs';
import { Tooltip } from '@/ui/overlays/tooltip';
import { ArrowLeft, PanelRight, X } from 'lucide-react';
import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ownsKeys } from 'App/utils/keys';

import { SessionAvatar } from 'Shared/SessionAvatar/SessionAvatar';

import './issue-header.css';
import './journey-panel.css';
import './replay-screen.css';
import './work-pane.css';

export interface ReplayPanelTab {
  key: string;
  label: string;
  count?: number;
  hint?: string;
}

export interface ReplayScreenProps {
  back?: { label: string; onClick: () => void };
  lead: ReactNode;
  actions?: ReactNode;
  /** Tabs of the side panel; `panel` may also be a transient key outside them. */
  panels?: ReplayPanelTab[];
  panel?: string | null;
  onPanel?: (key: string | null) => void;
  renderPanel?: (key: string) => ReactNode;
  panelWidth?: number;
  fullscreen?: boolean;
  className?: string;
  children: ReactNode;
}

/** The frame every replay shares: header, main column, optional side panel. */
export function ReplayScreen({
  back,
  lead,
  actions,
  panels = [],
  panel = null,
  onPanel,
  renderPanel,
  panelWidth,
  fullscreen,
  className,
  children,
}: ReplayScreenProps) {
  const { t } = useTranslation();
  const tabbed = panels.find((p) => p.key === panel) ?? null;
  const open = panel != null && renderPanel != null;
  const firstPanel = panels[0]?.key;

  // F toggles the side panel (Shift+F stays fullscreen in the players)
  React.useEffect(() => {
    if (!firstPanel || !onPanel) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'f' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey)
        return;
      if (ownsKeys(e.target)) return;
      onPanel(open ? null : firstPanel);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, firstPanel, onPanel]);

  return (
    <div
      className={`m-work${fullscreen ? ' is-fullscreen' : ''}${className ? ` ${className}` : ''}`}
    >
      <header className="m-ihdr">
        {back && (
          <>
            <Button
              variant="subtle"
              onClick={back.onClick}
              className="m-rs__back"
            >
              <ArrowLeft size={15} />
              {back.label}
            </Button>
            <span className="m-rs__sep" aria-hidden="true" />
          </>
        )}
        <div className="m-rs__lead">{lead}</div>
        {actions && <div className="m-ihdr__actions">{actions}</div>}
        {panels.length > 0 && onPanel && (
          <div className="m-ihdr__panels" role="group">
            <IconButton
              icon={<PanelRight size={15} />}
              label={
                open
                  ? t('Hide the side panel (F)')
                  : t('Show the side panel (F)')
              }
              variant="ghost"
              pressed={open}
              onClick={() => onPanel(open ? null : panels[0].key)}
            />
          </div>
        )}
      </header>
      <div className="m-work__body">
        <div className="m-work__main">{children}</div>
        {open && (
          <aside
            className="m-jrn"
            style={panelWidth ? { width: panelWidth } : undefined}
            aria-label={tabbed?.label ?? panel ?? undefined}
          >
            {tabbed && onPanel && (
              <div className="m-rs__aside-head">
                <Tabs
                  value={tabbed.key}
                  onValueChange={(k) => onPanel(k)}
                  className="m-rs__aside-tabs"
                >
                  <TabsList aria-label={t('Panel')} className="border-b-0">
                    {panels.map((p) => (
                      <Tooltip key={p.key} title={p.hint} delay={500}>
                        <span className="inline-flex">
                          <TabsTrigger value={p.key}>
                            {p.label}
                            {p.count != null && <CountSuffix n={p.count} />}
                          </TabsTrigger>
                        </span>
                      </Tooltip>
                    ))}
                  </TabsList>
                </Tabs>
                <span className="m-rs__aside-close">
                  <IconButton
                    icon={<X size={14} />}
                    label={t('Close the side panel')}
                    variant="ghost"
                    onClick={() => onPanel(null)}
                  />
                </span>
              </div>
            )}
            <div className="m-jrn__scroll">{renderPanel(panel)}</div>
          </aside>
        )}
      </div>
    </div>
  );
}

export function ReplayIdentity({
  seed,
  name,
  meta,
  title,
}: {
  seed: number;
  name: ReactNode;
  meta?: ReactNode;
  title?: string;
}) {
  return (
    <div className="m-rs__who">
      <SessionAvatar seed={seed} size={28} />
      <div className="m-rs__names">
        <Tooltip title={title} delay={500}>
          <span className="m-rs__name m-truncate">{name}</span>
        </Tooltip>
        {meta && <span className="m-rs__meta m-truncate">{meta}</span>}
      </div>
    </div>
  );
}

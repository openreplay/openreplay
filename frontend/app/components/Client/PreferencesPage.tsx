import { IconButton } from '@/ui/actions/IconButton';
import { Tabs, TabsList, TabsTrigger } from '@/ui/layout/tabs';
import { Tooltip } from '@/ui/overlays/tooltip';
import { ArrowLeft, Info } from 'lucide-react';
import React from 'react';

interface TabItem {
  key: string;
  label: React.ReactNode;
  children?: React.ReactNode;
}

interface Props {
  /** The shell prints the section title; this one shows only on a sub-view (with onBack). */
  title: React.ReactNode;
  /** muted value beside the bar's start — a count, usually */
  value?: React.ReactNode;
  help?: string;
  actions?: React.ReactNode;
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  onBack?: () => void;
  /** body renders flush — for the full-width lists and tables */
  flush?: boolean;
  children?: React.ReactNode;
}

/** A preferences section's toolbar, tabs and body inside the preferences shell. */
function PreferencesPage({
  title,
  value,
  help,
  actions,
  tabs,
  activeTab,
  onTabChange,
  onBack,
  flush = false,
  children,
}: Props) {
  // a lone help icon repeats the shell's lede, so it only rides along
  const bar = onBack || value != null || actions;
  const current = tabs?.find((i) => i.key === activeTab) ?? tabs?.[0];
  return (
    <div className="m-pref__page">
      {bar ? (
        <div className="m-pref__bar">
          {onBack ? (
            <>
              <IconButton
                icon={<ArrowLeft size={15} />}
                label="Back"
                variant="ghost"
                onClick={onBack}
              />
              <h3 className="m-pref__bar-title">{title}</h3>
            </>
          ) : null}
          {value != null ? (
            <span className="m-pref__bar-value">{value}</span>
          ) : null}
          {help ? (
            <Tooltip title={help} side="bottom">
              <span className="m-pref__bar-help" aria-label={help}>
                <Info size={14} />
              </span>
            </Tooltip>
          ) : null}
          {actions ? (
            <div className="m-pref__bar-actions">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {tabs?.length ? (
        <Tabs
          value={current?.key}
          onValueChange={(k) => onTabChange?.(k)}
          className="m-pref__tabs"
        >
          <TabsList className="border-b-0">
            {tabs.map((i) => (
              <TabsTrigger key={i.key} value={i.key}>
                {i.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
      {current?.children ? (
        <div className="m-pref__page-body">{current.children}</div>
      ) : null}
      {children ? (
        <div className={flush ? 'm-pref__page-flush' : 'm-pref__page-body'}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default PreferencesPage;

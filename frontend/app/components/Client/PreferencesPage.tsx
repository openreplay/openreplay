import { Tabs, Tooltip } from 'antd';
import type { TabsProps } from 'antd';
import { ArrowLeft, Info } from 'lucide-react';
import React from 'react';

const HEADER = 'flex items-center gap-2 border-b px-4 h-14 shrink-0';
const ACTIONS = 'flex items-center gap-2 ml-auto';

interface Props {
  title: React.ReactNode;
  /** muted value beside the title — a count, usually */
  value?: React.ReactNode;
  /** help tooltip on an info icon after the title */
  help?: string;
  /** right-hand controls — pass them size="small" */
  actions?: React.ReactNode;
  tabs?: TabsProps['items'];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  onBack?: () => void;
  /** body renders flush — for the full-width lists and tables */
  flush?: boolean;
  children?: React.ReactNode;
}

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
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className={HEADER}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center -ml-1 mr-0.5 cursor-pointer"
            style={{ color: 'var(--color-gray-medium)' }}
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <h1 className="text-lg font-semibold m-0 capitalize-first">{title}</h1>
        {value !== undefined && value !== null && (
          <span className="color-gray-medium">{value}</span>
        )}
        {help && (
          <Tooltip placement="bottom" title={help}>
            <span
              className="flex items-center cursor-help"
              style={{ color: 'var(--color-gray-medium)' }}
            >
              <Info size={15} />
            </span>
          </Tooltip>
        )}
        {/* the row is a fixed height, so pass small controls: size="small" */}
        {actions && <div className={ACTIONS}>{actions}</div>}
      </div>

      {tabs && (
        <Tabs
          activeKey={activeTab}
          onChange={onTabChange}
          items={tabs}
          tabBarStyle={{ paddingLeft: 16, paddingRight: 16, marginBottom: 0 }}
        />
      )}
      {children && <div className={flush ? undefined : 'p-5'}>{children}</div>}
    </div>
  );
}

export default PreferencesPage;

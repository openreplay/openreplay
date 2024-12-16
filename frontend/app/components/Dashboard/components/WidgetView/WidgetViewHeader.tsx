import React from 'react';
import cn from 'classnames';
import WidgetName from 'Components/Dashboard/components/WidgetName';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import AddToDashboardButton from 'Components/Dashboard/components/AddToDashboardButton';
import { Button, Space, Tooltip } from 'antd';
import CardViewMenu from 'Components/Dashboard/components/WidgetView/CardViewMenu';
import { Link2 } from 'lucide-react'
import copy from 'copy-to-clipboard';
import MetricTypeSelector from "../MetricTypeSelector";

interface Props {
  onClick?: () => void;
  onSave: () => void;
}

const defaultText = 'Copy link to clipboard'

function WidgetViewHeader({ onClick, onSave }: Props) {
  const [tooltipText, setTooltipText] = React.useState(defaultText);
  const { metricStore } = useStore();
  const widget = metricStore.instance;

  const copyUrl = () => {
    const url = window.location.href;
    copy(url)
    setTooltipText('Link copied to clipboard!');
    setTimeout(() => setTooltipText(defaultText), 2000);
  }
  return (
    <div
      className={cn(
        'flex justify-between items-center bg-white rounded px-4 py-2 border border-gray-lighter'
      )}
      onClick={onClick}
    >
      <h1 className="mb-0 text-2xl mr-4 min-w-fit">
        <WidgetName
          name={widget.name}
          onUpdate={(name) => metricStore.merge({ name })}
          canEdit={true}
        />
      </h1>
      <Space>
        <AddToDashboardButton metricId={widget.metricId} />
        <MetricTypeSelector />
        <Tooltip title={tooltipText}>
          <Button disabled={!widget.exists()} onClick={copyUrl} icon={<Link2 size={16} strokeWidth={1} />}></Button>
        </Tooltip>
        <Button
          type="primary"
          onClick={onSave}
          loading={metricStore.isSaving}
          disabled={metricStore.isSaving || (widget.exists() && !widget.hasChanged)}
        >
          {widget.exists() ? 'Update' : 'Create'}
        </Button>
        <CardViewMenu />
      </Space>
    </div>
  );
}

export default observer(WidgetViewHeader);

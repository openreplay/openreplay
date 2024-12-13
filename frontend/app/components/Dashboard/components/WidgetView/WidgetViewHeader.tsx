import React from 'react';
import cn from 'classnames';
import WidgetName from 'Components/Dashboard/components/WidgetName';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import AddToDashboardButton from 'Components/Dashboard/components/AddToDashboardButton';
import { Button, Space } from 'antd';
import CardViewMenu from 'Components/Dashboard/components/WidgetView/CardViewMenu';
import { Link } from 'lucide-react'
import copy from 'copy-to-clipboard';
import MetricTypeSelector from "../MetricTypeSelector";

interface Props {
  onClick?: () => void;
  onSave: () => void;
}

function WidgetViewHeader({ onClick, onSave }: Props) {
  const { metricStore } = useStore();
  const widget = metricStore.instance;

  const copyUrl = () => {
    const url = window.location.href;
    copy(url)
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
        <Button onClick={copyUrl} icon={<Link size={16} strokeWidth={1} />}></Button>
        <Button
          type="primary"
          onClick={onSave}
          loading={metricStore.isSaving}
          disabled={metricStore.isSaving || !widget.hasChanged}
        >
          {widget.exists() ? 'Update' : 'Create'}
        </Button>
        <CardViewMenu />
      </Space>
    </div>
  );
}

export default observer(WidgetViewHeader);

import React from 'react';
import cn from 'classnames';
import WidgetName from 'Components/Dashboard/components/WidgetName';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { USER_PATH } from 'App/constants/card';
import { Button, Space, Tooltip } from 'antd';
import CardViewMenu from 'Components/Dashboard/components/WidgetView/CardViewMenu';
import { Link2 } from 'lucide-react';
import copy from 'copy-to-clipboard';
import { useTranslation } from 'react-i18next';

interface Props {
  onClick?: () => void;
  onSave: () => void;
  undoChanges: () => void;
  layoutControl?: React.ReactNode;
  isPreview?: boolean;
}

function WidgetViewHeader({
  onClick,
  onSave,
  layoutControl,
  isPreview,
}: Props) {
  const { t } = useTranslation();
  const defaultText = t('Copy link to clipboard');
  const [tooltipText, setTooltipText] = React.useState(defaultText);

  const { metricStore } = useStore();
  const widget = metricStore.instance;

  const handleSave = () => {
    if (!isPreview && widget.metricType === USER_PATH) {
      widget.hideExcess = true; // Force grouped view
    }
    onSave();
  };

  const copyUrl = () => {
    const url = window.location.href;
    copy(url);
    setTooltipText(t('Link copied to clipboard!'));
    setTimeout(() => setTooltipText(defaultText), 2000);
  };
  return (
    <div
      className={cn(
        'flex justify-between items-center bg-white rounded-lg shadow-sm px-4 ps-2 py-2 border border-gray-lighter input-card-title flex-wrap',
      )}
      onClick={onClick}
    >
      <h1 className="mb-0 text-2xl mr-4 min-w-fit ">
        <WidgetName
          name={widget.name}
          onUpdate={(name) => {
            metricStore.merge({ name });
          }}
          canEdit
        />
      </h1>
      <Space>
        <Button
          type={
            metricStore.isSaving || (widget.exists() && !widget.hasChanged)
              ? 'text'
              : 'primary'
          }
          onClick={handleSave}
          loading={metricStore.isSaving}
          disabled={
            metricStore.isSaving || (widget.exists() && !widget.hasChanged)
          }
          className="font-medium btn-update-card"
          size="small"
        >
          {widget.exists() ? t('Update') : t('Create')}
        </Button>

        {/* <MetricTypeSelector /> */}

        <Tooltip title={tooltipText}>
          <Button
            type="text"
            className="btn-copy-card-url"
            disabled={!widget.exists()}
            onClick={copyUrl}
            icon={<Link2 size={16} strokeWidth={1} />}
          />
        </Tooltip>
        {layoutControl}
        <CardViewMenu />
      </Space>
    </div>
  );
}

export default observer(WidgetViewHeader);

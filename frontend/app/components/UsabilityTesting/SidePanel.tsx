import { useStore } from 'App/mstore';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Typography, Switch, Button, Space, Tooltip, Alert } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface SidePanelProps {
  onSave: () => void;
  onPreview: () => void;
  taskLen: number;
  isStartingPointValid: boolean;
}

const SidePanel: React.FC<SidePanelProps> = ({
  onSave,
  onPreview,
  taskLen,
  isStartingPointValid,
}) => {
  const { t } = useTranslation();
  const { uxtestingStore } = useStore();

  const canPublishOrPreview = taskLen > 0 && isStartingPointValid;

  return (
    <div className="flex flex-col gap-2 col-span-1">
      <div className="p-4 bg-white rounded-lg shadow-sm flex flex-col gap-2">
        <Typography.Text strong>
          {t('Participant Requirements')}
        </Typography.Text>
        <div className="text-sm py-2">
          {t(
            "Enable the camera and mic to observe participants' reactions and hear their comments for better insights",
          )}
          .
        </div>
        {uxtestingStore.instance && (
          <>
            <div className="flex justify-between">
              <Typography.Text>{t('Mic')}</Typography.Text>
              <Switch
                checked={uxtestingStore.instance.requireMic}
                onChange={(checked) =>
                  uxtestingStore.instance?.setProperty('requireMic', checked)
                }
                checkedChildren="Required"
                unCheckedChildren="Not Required"
              />
            </div>
            <div className="flex justify-between">
              <Typography.Text>{t('Camera')}</Typography.Text>
              <Switch
                checked={uxtestingStore.instance.requireCamera}
                onChange={(checked) =>
                  uxtestingStore.instance?.setProperty('requireCamera', checked)
                }
                checkedChildren="Required"
                unCheckedChildren="Not Required"
              />
            </div>
          </>
        )}
      </div>

      {!canPublishOrPreview && (
        <Alert
          message={t(
            "This test isn't published yet. You need to specify a title and tasks to publish it.",
          )}
          type="warning"
          showIcon
          className="mt-4 border-0 rounded-lg items-baseline mb-3 text-sm"
          closable
        />
      )}

      <Tooltip
        title={
          !canPublishOrPreview
            ? t('Define the starting point and the tasks to preview.')
            : ''
        }
      >
        <Button
          type="primary"
          ghost
          onClick={onPreview}
          disabled={!canPublishOrPreview}
        >
          <Space align="center">
            {t('Save Draft & Preview')}&nbsp;
            <ExportOutlined />
          </Space>
        </Button>
      </Tooltip>
      <Tooltip
        title={
          !canPublishOrPreview
            ? t('Define the starting point and the tasks to publish.')
            : ''
        }
      >
        <Button type="primary" onClick={onSave} disabled={!canPublishOrPreview}>
          {t('Publish Test')}
        </Button>
      </Tooltip>
    </div>
  );
};

export default observer(SidePanel);

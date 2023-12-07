import { useStore } from 'App/mstore';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Typography, Switch, Button, Space, Tooltip } from 'antd';
import { ExportOutlined } from '@ant-design/icons';

const SidePanel = observer(({ onSave, onPreview, taskLen, isStartingPointValid }: any) => {
  const { uxtestingStore } = useStore();
  return (
    <div className={'flex flex-col gap-2 col-span-1'}>
      <div className={'p-4 bg-white rounded border flex flex-col gap-2'}>
        <Typography.Text strong>Participant Requirements</Typography.Text>
        <div className={'flex justify-between'}>
          <Typography.Text>Mic</Typography.Text>
          <Switch
            checked={uxtestingStore.instance!.requireMic}
            defaultChecked={uxtestingStore.instance!.requireMic}
            onChange={(checked) => uxtestingStore.instance!.setProperty('requireMic', checked)}
            checkedChildren="Yes"
            unCheckedChildren="No"
          />
        </div>
        <div className={'flex justify-between'}>
          <Typography.Text>Camera</Typography.Text>
          <Switch
            checked={uxtestingStore.instance!.requireCamera}
            defaultChecked={uxtestingStore.instance!.requireCamera}
            onChange={(checked) => uxtestingStore.instance!.setProperty('requireCamera', checked)}
            checkedChildren="Yes"
            unCheckedChildren="No"
          />
        </div>
        <div className={'text-disabled-text text-sm'}>
          If required, enable camera and mic access to observe participants' facial expressions and
          verbal feedback in real-time, providing deeper insights into their user experience during
          the test.
        </div>
      </div>

      <Tooltip title={taskLen === 0 ? 'Define the starting point and the tasks to proceed.' : ''}>
        <Button type={'primary'} ghost onClick={onPreview} disabled={taskLen === 0 || !isStartingPointValid}>
          <Space align={'center'}>
            Save Draft & Preview <ExportOutlined rev={undefined} />
          </Space>
        </Button>
      </Tooltip>
      <Tooltip title={taskLen === 0 ? 'Define the starting point and the tasks to proceed.' : ''}>
        <Button type={'primary'} onClick={onSave} disabled={taskLen === 0 || !isStartingPointValid}>
          Publish Test
        </Button>
      </Tooltip>
    </div>
  );
});

export default SidePanel;
